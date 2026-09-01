import { useEffect, useMemo, useState } from "react";

import { useIsMobile } from "@/hooks/use-mobile";

export function useAdminListPagination<T>(items: T[], desktopPageSize = 6) {
  const isMobile = useIsMobile();
  const pageSize = isMobile ? 3 : desktopPageSize;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => setPage(1), [items.length, pageSize]);
  useEffect(() => setPage((value) => Math.min(value, totalPages)), [totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { page, pageItems, pageSize, setPage, totalPages };
}
