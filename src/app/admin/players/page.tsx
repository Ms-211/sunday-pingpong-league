import { getPlayers } from "@/lib/data";
import { PlayersManager } from "@/components/PlayersManager";

export const dynamic="force-dynamic";

export default async function Page(){
  const players=await getPlayers();
  return <PlayersManager initialPlayers={players}/>;
}
