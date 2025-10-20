import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async upsertExternalUser(externalId: string, name: string, avatarUrl?: string): Promise<User> {
    let user = await this.usersRepository.findOne({ where: { externalId } });

    if (user) {
      // Update existing user
      user.name = name;
      if (avatarUrl !== undefined) {
        user.avatarUrl = avatarUrl;
      }
      return this.usersRepository.save(user);
    } else {
      // Create new user
      const newUser = this.usersRepository.create({
        externalId,
        name,
        avatarUrl,
      });
      return this.usersRepository.save(newUser);
    }
  }
}