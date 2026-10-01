import PlayerProfilePage from "@/components/PlayerProfilePage";
export const dynamic = "force-dynamic";
export default function Page(props: { params: Promise<{ playerId: string }>; searchParams: Promise<{ season?: string; page?: string }> }) { return PlayerProfilePage(props); }
