import { useMemo } from "react";
import { useMyDay } from "@/hooks/useMyDay";
import { useMyDayWorkspace } from "@/hooks/useMyDayWorkspace";
import {
  buildMyDayBoardInboxItems,
  buildMyDayBoardSourceItems,
  type MyDayBoardCard,
} from "@/lib/my-day-board";

export function useMyDayBoardInbox(cards: MyDayBoardCard[]) {
  const myDay = useMyDay();
  const workspace = useMyDayWorkspace();

  const items = useMemo(
    () =>
      buildMyDayBoardInboxItems(
        workspace.tasks,
        myDay.agendaEvents,
        cards,
      ),
    [cards, myDay.agendaEvents, workspace.tasks],
  );

  const sourceItems = useMemo(
    () => buildMyDayBoardSourceItems(workspace.tasks, myDay.agendaEvents),
    [myDay.agendaEvents, workspace.tasks],
  );

  return {
    items,
    sourceItems,
    isLoading: myDay.loading.agenda || workspace.loading.tasks,
    isRefreshing: myDay.isRefreshing || workspace.isRefreshing,
    error: myDay.errors.agenda ?? workspace.errors.tasks,
    refresh: async () => {
      await Promise.all([
        myDay.refreshers.agenda(),
        workspace.refreshTasks(),
      ]);
    },
  };
}
