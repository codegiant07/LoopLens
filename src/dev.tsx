// `npm run dev` only (never in the production bundle): renders the page for the current URL in the browser.
import { createRoot } from "react-dom/client";
import App from "./App";
import { trace } from "./engine";
import { exampleCode } from "./examples";
import Page from "./Page";
import { panelLevel, routeFor } from "./routes";

const route = routeFor(location.pathname);
document.title = route.title;
createRoot(document.getElementById("root")!).render(
  <Page
    route={route}
    viz={
      route.sample !== undefined && (
        <App
          initial={route.sample}
          level={panelLevel(route)}
          init={trace(exampleCode(route.sample))}
        />
      )
    }
  />,
);
