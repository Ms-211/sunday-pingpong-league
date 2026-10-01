"use client";

import { Children, useState, type ReactNode } from "react";

export function CompactRecords({ className, children }: { className: string; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const records = Children.toArray(children);
  return <div className={`${className} compact-records${expanded ? " expanded" : ""}`}>
    {records}
    {records.length > 2 && <button type="button" className="compact-records-toggle" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "접기" : `외 ${records.length - 2}명 더 보기`}</button>}
  </div>;
}
