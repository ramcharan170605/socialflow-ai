import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health(.*)',
  '/api/platforms/callback(.*)',
]);

const isProtectedApi = createRouteMatcher([
  '/api/generate(.*)',
  '/api/crawl(.*)',
  '/api/history(.*)',
  '/api/usage(.*)',
  '/api/stream(.*)',
  '/api/platforms/connect(.*)',
  '/api/platforms/accounts(.*)',
  '/api/platforms/disconnect(.*)',
  '/api/workflow(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  if (isProtectedApi(req) || req.nextUrl.pathname.startsWith('/dashboard')) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
