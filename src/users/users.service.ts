import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { getPaginationResponse } from '../common/helper-functions/get-pagination-meta';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async upsertExternalUser(
    externalId: string,
    name: string,
    avatarUrl?: string,
    role?: UserRole,
  ): Promise<User> {
    let user = await this.usersRepository.findOne({ where: { externalId } });

    if (user) {
      // Update existing user
      user.name = name;
      if (avatarUrl !== undefined) {
        user.avatarUrl = avatarUrl;
      }
      if (role !== undefined) {
        user.role = role;
      }
      return this.usersRepository.save(user);
    } else {
      // Create new user
      const newUser = this.usersRepository.create({
        externalId,
        name,
        avatarUrl,
        role: role,
      });
      return this.usersRepository.save(newUser);
    }
  }

  async findByExternalId(externalId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { externalId } });
  }

  async findAllExcept(externalId: number, paginationDto: PaginationDto) {
    const qb = this.usersRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.externalId', 'user.name'])
      .where('user.id != :externalId', { externalId });

    return getPaginationResponse(paginationDto, qb);
  }

  async findByExternalIds(externalIds: string[], paginationDto: PaginationDto) {
    if (!externalIds.length) {
      const qb = this.usersRepository
        .createQueryBuilder('user')
        .select(['user.id', 'user.externalId', 'user.name'])
        .where('1 = 0');

      return getPaginationResponse(paginationDto, qb);
    }
    const qb = this.usersRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.externalId', 'user.name'])
      .where('user.externalId IN (:...externalIds)', { externalIds });

    return getPaginationResponse(paginationDto, qb);
  }
}
