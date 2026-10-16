import { useEffect, useRef } from "react";
import { Layout } from "./components/Layout";
import { useRoute, type Route } from "./lib/router";
import { DataPage } from "./pages/DataPage";
import { DevPage } from "./pages/DevPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RequirementDetailPage } from "./pages/RequirementDetailPage";
import { RequirementsPage } from "./pages/RequirementsPage";

function routeKey(route: Route): string {
  return route.name === "requirement" ? `requirement:${route.id}` : route.name;
}

export function App() {
  const route = useRoute();
  const key = routeKey(route);
  const firstRender = useRef(true);

  // On navigation, move keyboard and screen-reader focus to the new page's heading
  // and scroll to the top, as a full page load would.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    document.querySelector<HTMLElement>("main h1")?.focus();
  }, [key]);

  return (
    <Layout route={route}>
      {route.name === "home" && <HomePage />}
      {route.name === "requirements" && <RequirementsPage query={route.query} />}
      {route.name === "requirement" && <RequirementDetailPage key={route.id} id={route.id} />}
      {route.name === "data" && <DataPage />}
      {route.name === "dev" && <DevPage />}
      {route.name === "notFound" && <NotFoundPage />}
    </Layout>
  );
}
