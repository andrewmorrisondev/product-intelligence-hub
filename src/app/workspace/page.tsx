import Dashboard from "@/components/Dashboard";
import { getPrivateDataset } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function PrivateWorkspace() {
  if (!process.env.DATABASE_URL) return <main style={{ padding: 48, fontFamily: "sans-serif" }}><h1>Database not configured</h1><p>Set DATABASE_URL, WORKSPACE_PASSWORD, GITHUB_OWNER, and GITHUB_REPO. Run npm run db:push, then reopen this page.</p><a href="/">View fictional public demo</a></main>;
  try { return <Dashboard data={await getPrivateDataset()}/>; }
  catch { return <main style={{padding:48,fontFamily:"sans-serif"}}><h1>Database connection unavailable</h1><p>Verify DATABASE_URL and run npm run db:push.</p></main>; }
}
