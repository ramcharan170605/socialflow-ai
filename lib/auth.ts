import { auth, currentUser } from '@clerk/nextjs/server';

export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('UNAUTHORIZED');
  }
  return userId;
}

export async function getAuthUser() {
  const user = await currentUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress ?? '',
    name: user.fullName ?? user.firstName ?? 'User',
    imageUrl: user.imageUrl,
  };
}
