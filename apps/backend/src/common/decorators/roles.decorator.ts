import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@growth-engine/shared-types';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to users whose role meets or exceeds the minimum role listed.
 * Role hierarchy: owner > admin > member > viewer.
 *
 * Usage:
 *   @Roles('admin')        — allows owner and admin
 *   @Roles('owner')        — allows only owner
 *   @Roles('member')       — allows owner, admin, and member
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
