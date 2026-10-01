import { describe, expect, it } from "vitest";
import { calculateGroupedStandings, calculateStandings } from "./calculateStandings";
import type { Match, MatchResult, Participant } from "@/types/domain";
const ps=(...ids:string[]):Participant[]=>ids.map((id,i)=>({id,playerId:id,name:id,division:null,schedulePosition:i+1}));
const game=(id:string,a:string,b:string,as:number,bs:number):[Match,MatchResult]=>[{id,playerAId:a,playerBId:b,roundNo:1,roundMatchNo:1},{matchId:id,playerASets:as,playerBSets:bs}];
const rank=(players:string[],games:ReturnType<typeof game>[])=>calculateStandings(ps(...players),games.map(g=>g[0]),games.map(g=>g[1]));
describe("standings",()=>{
 it("승수 내림차순",()=>expect(rank(["A","B","C"],[game("1","A","B",2,0),game("2","A","C",2,0),game("3","B","C",2,0)]).map(x=>x.playerId)).toEqual(["A","B","C"]));
 it("2명 동률은 상대전적",()=>{const r=rank(["A","B","C","D"],[game("1","A","B",2,1),game("2","C","A",2,0),game("3","A","D",2,0),game("4","B","C",2,0),game("5","B","D",2,0),game("6","D","C",2,0)]);expect(r.findIndex(x=>x.playerId==="A")).toBeLessThan(r.findIndex(x=>x.playerId==="B"));});
 it("3명 순환은 미니리그 세트득실",()=>expect(rank(["A","B","C"],[game("1","A","B",2,0),game("2","B","C",2,1),game("3","C","A",2,1)]).map(x=>x.playerId)).toEqual(["A","C","B"]));
 it("4명 이상 부분 동률도 모든 선수를 유지",()=>{const r=rank(["A","B","C","D"],[game("1","A","B",2,0),game("2","A","C",2,0),game("3","D","A",2,0),game("4","B","C",2,1),game("5","B","D",2,0),game("6","C","D",2,0)]);expect(new Set(r.map(x=>x.playerId)).size).toBe(4);});
 it("완전 동일은 공동순위",()=>{const r=rank(["A","B"],[]);expect(r.map(x=>x.rank)).toEqual([1,1]);});
 it("A/B조 우승자를 각각 1위로 계산",()=>{const participants=ps("A","B","C","D").map((player,index)=>({...player,groupNo:index<2?1:2}));const games=[game("1","A","B",2,0),game("2","C","D",2,0)];const matches=games.map(([match],index)=>({...match,groupNo:index+1}));expect(calculateGroupedStandings(participants,matches,games.map(([,result])=>result)).filter(row=>row.rank===1).map(row=>row.playerId)).toEqual(["A","C"]);});
});
