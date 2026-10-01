import { getStatisticsData, selectedSeason } from "@/lib/statistics-data";
import { SeasonStatistics } from "@/components/StatisticsView";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const query = await searchParams, data = await getStatisticsData(), season = selectedSeason(data.seasons, query.season);
  return <main className="container">{season ? <SeasonStatistics data={data} season={season}/> : <p>시즌이 없습니다.</p>}</main>;
}
