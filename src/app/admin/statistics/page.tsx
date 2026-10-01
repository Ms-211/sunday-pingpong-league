import { SeasonStatistics } from "@/components/StatisticsView";
import { getStatisticsData, selectedSeason } from "@/lib/statistics-data";
import { koreaDate } from "@/lib/statistics";

export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const query = await searchParams;
  const data = await getStatisticsData();
  const seasons = data.seasons.filter(season=>season.start_date.startsWith(koreaDate().slice(0,4)));
  const career = query.season === "career";
  const season = career ? undefined : selectedSeason(seasons, query.season);
  return career||season ? <SeasonStatistics data={data} season={season} career={career} seasons={seasons} admin/> : <p>시즌이 없습니다.</p>;
}
