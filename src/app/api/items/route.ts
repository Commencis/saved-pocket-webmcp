import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, getTableColumns, inArray, sql, type SQL } from "drizzle-orm";
import { db, sql as pgSql } from "@/db/client";
import { analysisStatusEnum, categories, collectionItems, items, platformEnum } from "@/db/schema";
import { embedText } from "@/lib/embeddings";
import { resolveUser } from "@/lib/session";

const PAGE_SIZE = 30;
// e5 cosine distances are compressed; beyond ~0.25 results are usually noise
const VECTOR_DISTANCE_CUTOFF = 0.25;
const VECTOR_TOP_K = 30;

export async function GET(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const categoryId = params.get("category");
  const platform = params.get("platform");
  const status = params.get("status");
  const unread = params.get("unread") === "1";
  const sort = params.get("sort");
  const page = Math.max(1, Number(params.get("page") ?? 1));
  const limit = Math.min(200, Math.max(1, Number(params.get("limit") ?? PAGE_SIZE)));

  const collectionId = params.get("collection");
  const collectionFilter =
    collectionId && !Number.isNaN(Number(collectionId)) ? Number(collectionId) : null;
  const categoryFilter =
    categoryId && !Number.isNaN(Number(categoryId)) ? Number(categoryId) : null;
  const platformFilter =
    platform && (platformEnum.enumValues as string[]).includes(platform)
      ? (platform as (typeof platformEnum.enumValues)[number])
      : null;
  const statusFilter =
    status && (analysisStatusEnum.enumValues as string[]).includes(status)
      ? (status as (typeof analysisStatusEnum.enumValues)[number])
      : null;

  // Resolve collection → item ID set (used in both search paths)
  let collectionItemIds: string[] | null = null;
  if (collectionFilter !== null) {
    const ciRows = await db
      .select({ itemId: collectionItems.itemId })
      .from(collectionItems)
      .where(eq(collectionItems.collectionId, collectionFilter));
    collectionItemIds = ciRows.map((r) => r.itemId);
    if (collectionItemIds.length === 0) {
      return NextResponse.json({ items: [], total: 0, page, pageSize: limit });
    }
  }

  if (q) {
    let queryVector: number[] | null = null;
    try {
      queryVector = await embedText(q, "query");
    } catch (err) {
      console.error("[search] query embedding failed, using FTS only", err);
    }
    const result = await hybridSearch({
      userId: user.id,
      q,
      queryVector,
      categoryFilter,
      platformFilter,
      statusFilter,
      unread,
      collectionItemIds,
      sort,
      page,
      limit,
    });
    return NextResponse.json({ ...result, page, pageSize: limit });
  }

  const conditions: SQL[] = [eq(items.userId, user.id)];
  if (categoryFilter !== null) conditions.push(eq(items.categoryId, categoryFilter));
  if (platformFilter) conditions.push(eq(items.platform, platformFilter));
  if (statusFilter) conditions.push(eq(items.analysisStatus, statusFilter));
  if (unread) conditions.push(eq(items.visitCount, 0));
  if (collectionItemIds !== null) conditions.push(inArray(items.id, collectionItemIds));
  const where = and(...conditions);

  let orderBy: SQL;
  switch (sort) {
    case "oldest":
      orderBy = asc(items.createdAt);
      break;
    case "most_visited":
      orderBy = desc(items.visitCount);
      break;
    case "recently_visited":
      orderBy = sql`${items.lastVisitedAt} DESC NULLS LAST`;
      break;
    default:
      orderBy = desc(items.createdAt);
  }

  // Exclude the heavy embedding + tsvector columns from responses
  const {
    embedding: _embedding,
    searchVector: _searchVector,
    ...itemColumns
  } = getTableColumns(items);

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({ ...itemColumns, categoryName: categories.name })
      .from(items)
      .leftJoin(categories, eq(items.categoryId, categories.id))
      .where(where)
      .orderBy(orderBy, desc(items.id))
      .limit(limit)
      .offset((page - 1) * limit),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(items)
      .where(where),
  ]);

  return NextResponse.json({ items: rows, total: count, page, pageSize: limit });
}

interface HybridArgs {
  userId: string;
  q: string;
  queryVector: number[] | null;
  categoryFilter: number | null;
  platformFilter: string | null;
  statusFilter: string | null;
  unread: boolean;
  collectionItemIds: string[] | null;
  sort: string | null;
  page: number;
  limit: number;
}

/**
 * Reciprocal Rank Fusion of full-text matches and vector nearest neighbours.
 * FTS finds exact keyword hits; the vector branch finds semantically related
 * items even when no keyword overlaps (incl. cross-language queries).
 */
async function hybridSearch(args: HybridArgs) {
  const vectorLiteral = args.queryVector ? `[${args.queryVector.join(",")}]` : null;

  const catF =
    args.categoryFilter !== null
      ? pgSql`AND category_id = ${args.categoryFilter}`
      : pgSql``;
  const platF = args.platformFilter
    ? pgSql`AND platform = ${args.platformFilter}::platform`
    : pgSql``;
  const statF = args.statusFilter
    ? pgSql`AND analysis_status = ${args.statusFilter}::analysis_status`
    : pgSql``;
  const unreadF = args.unread ? pgSql`AND visit_count = 0` : pgSql``;
  const colF =
    args.collectionItemIds !== null
      ? pgSql`AND id = ANY(${args.collectionItemIds}::uuid[])`
      : pgSql``;

  let orderExpr;
  switch (args.sort) {
    case "oldest":
      orderExpr = pgSql`i.created_at ASC`;
      break;
    case "newest":
      orderExpr = pgSql`i.created_at DESC`;
      break;
    case "most_visited":
      orderExpr = pgSql`i.visit_count DESC`;
      break;
    case "recently_visited":
      orderExpr = pgSql`i.last_visited_at DESC NULLS LAST`;
      break;
    default:
      orderExpr = pgSql`r.score DESC`;
  }

  const vecBranch = vectorLiteral
    ? pgSql`
      SELECT id, row_number() OVER (ORDER BY dist) AS rn
      FROM (
        SELECT id, embedding <=> ${vectorLiteral}::vector AS dist
        FROM filtered
        WHERE embedding IS NOT NULL
        ORDER BY dist
        LIMIT ${VECTOR_TOP_K}
      ) nn
      WHERE dist <= ${VECTOR_DISTANCE_CUTOFF}`
    : pgSql`SELECT NULL::uuid AS id, NULL::bigint AS rn WHERE false`;

  const rows = await pgSql`
    WITH filtered AS (
      SELECT id, search_vector, embedding
      FROM items
      WHERE user_id = ${args.userId} ${catF} ${platF} ${statF} ${unreadF} ${colF}
    ),
    fts AS (
      SELECT id, row_number() OVER (
        ORDER BY ts_rank(search_vector, websearch_to_tsquery('english', ${args.q})) DESC
      ) AS rn
      FROM filtered
      WHERE search_vector @@ websearch_to_tsquery('english', ${args.q})
    ),
    vec AS (${vecBranch}),
    ranked AS (
      SELECT COALESCE(f.id, v.id) AS id,
             COALESCE(1.0 / (60 + f.rn), 0) + COALESCE(1.0 / (60 + v.rn), 0) AS score
      FROM fts f
      FULL OUTER JOIN vec v ON f.id = v.id
    )
    SELECT
      i.id,
      i.platform,
      i.external_id      AS "externalId",
      i.url,
      i.title,
      i.description,
      i.image_url        AS "imageUrl",
      i.local_image_path AS "localImagePath",
      i.category_id      AS "categoryId",
      i.tags,
      i.user_tags        AS "userTags",
      i.notes,
      i.summary,
      i.analysis_status           AS "analysisStatus",
      i.analysis_error            AS "analysisError",
      i.analysis_tokens_in        AS "analysisTokensIn",
      i.analysis_tokens_out       AS "analysisTokensOut",
      i.image_analysis_tokens_in  AS "imageAnalysisTokensIn",
      i.image_analysis_tokens_out AS "imageAnalysisTokensOut",
      i.visit_count               AS "visitCount",
      i.last_visited_at  AS "lastVisitedAt",
      i.link_status      AS "linkStatus",
      i.link_checked_at  AS "linkCheckedAt",
      i.saved_at         AS "savedAt",
      i.created_at       AS "createdAt",
      i.updated_at       AS "updatedAt",
      c.name             AS "categoryName",
      count(*) OVER ()::int AS "totalCount"
    FROM ranked r
    JOIN items i ON i.id = r.id
    LEFT JOIN categories c ON c.id = i.category_id
    ORDER BY ${orderExpr}, i.id DESC
    LIMIT ${args.limit} OFFSET ${(args.page - 1) * args.limit}`;

  const total = rows.length > 0 ? (rows[0].totalCount as number) : 0;
  return {
    items: rows.map(({ totalCount: _tc, ...item }) => item),
    total,
  };
}
