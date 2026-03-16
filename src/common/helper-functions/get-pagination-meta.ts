import { PaginationDto, PaginationMeta } from '../dto/pagination.dto';
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export async function getPaginationResponse<Entity extends ObjectLiteral>(
  paginationDto: PaginationDto,
  qb: SelectQueryBuilder<Entity>,
  data?: any,
  total?: any,
) {
  if (!data && !total) {
    const paginatedData = await getPaginatedData(paginationDto, qb);
    data = paginatedData.data;
    total = paginatedData.total;
  }

  const meta = getPaginatedMeta(paginationDto, total);

  return { data, meta };
}

export async function getPaginatedData<Entity extends ObjectLiteral>(
  paginationDto: PaginationDto,
  qb: SelectQueryBuilder<Entity>,
) {
  const { limit = 20, page = 1 } = paginationDto;
  const [data, total] = await qb
    .clone()
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();

  return { data, total };
}

export function getPaginatedMeta(paginationDto: PaginationDto, total: number) {
  const { limit = 20, page = 1 } = paginationDto;

  const totalPages = Math.ceil(total / limit);
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    from,
    to,
  };

  return meta;
}
