import { Dashboard } from '@/components/dashboard';
import { newsProvider, categoryDefinitions } from '@/lib/news/provider';
export default async function Home() {
  const batch = await newsProvider.load();
  return <Dashboard batch={batch} definitions={categoryDefinitions}/>;
}
