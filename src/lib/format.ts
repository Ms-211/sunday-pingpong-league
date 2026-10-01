export function formatPlayerName(name:string,division:string|null|undefined){return division?`${name}(${division})`:name}
export function formatDivision(division:string|null|undefined){return division?division==="게스트"?division:`${division}부`:"-"}
export function leagueTitle(round:number){return `제${round}회 조&애플 일요리그`}
