import { useEffect, useMemo, useState } from "react";

export function useReportPagination<T>(items: T[], pageSize: number) {
  const [requestedPage, setRequestedPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);

  useEffect(() => {
    setRequestedPage(1);
  }, [items]);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [currentPage, items, pageSize]);

  return {
    currentPage,
    pageItems,
    pageSize,
    setCurrentPage: setRequestedPage,
    totalPages,
  };
}
