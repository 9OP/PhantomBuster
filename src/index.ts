"phantombuster package: 5";
"phantombuster command: nodejs";
"phantombuster flags: save-folder";

import Buster from "phantombuster";
import puppeteer from "puppeteer";

const MARMITON_URL = "https://www.marmiton.org";

// the class names are obfuscated
const SELECTORS: Record<keyof IRecipe, string> = {
  name: ".MRTN__sc-30rwkm-0",
  url: ".MRTN__sc-1gofnyi-2",
  rating: ".SHRD__sc-10plygc-0",
  reviews: ".MRTN__sc-30rwkm-3",
};

// Represents a scrapped recipe from marmiton website
interface IRecipe {
  name: string;
  url: string;
  rating: string;
  reviews: string;
}

// Search parameters
interface IFilter {
  search: string; // aqt
  type?: IFilterType[]; // dt
  difficulty?: IFilterDifficulty[]; // dif
  expense?: IFilterExpense[]; // exp
  particularity?: IFilterParticularity[]; // prt
  cooking?: IFilterCooking[]; // rct
  time?: IFilterTime[]; // ttlt
}
type IFilterType =
  | "entree"
  | "platprincipal"
  | "dessert"
  | "amusegueule"
  | "sauce"
  | "accompagnement"
  | "boisson"
  | "confiserie";
type IFilterDifficulty = 1 | 2 | 3 | 4;
type IFilterExpense = 1 | 2 | 3;
type IFilterParticularity = 1 | 2 | 3 | 4 | 5;
type IFilterCooking = 1 | 2 | 3 | 4 | 5;
type IFilterTime = 15 | 30 | 45;

// Convert a param to the query parameters accepted by marmiton
const get_query_param = (param: keyof IFilter) => {
  switch (param) {
    case "search":
      return "aqt";
    case "type":
      return "dt";
    case "difficulty":
      return "dif";
    case "expense":
      return "exp";
    case "particularity":
      return "prt";
    case "cooking":
      return "rct";
    case "time":
      return "ttl";
  }
};

// Build the search url with query parameters
const get_url = (search: IFilter): string => {
  const query = Object.keys(search).reduce((acc: string, el: string) => {
    const key = el as keyof IFilter; // it is not as dangerous as it seems since search is indeed an IFilter
    const query_param = get_query_param(key);

    if (search[key] == null) {
      return acc;
    }

    if (key === "search") {
      acc += query_param + "=" + search[key].replace(/\s/g, "-");
    } else {
      const param = `&${query_param}=`;
      acc += param + search[key]?.join(param);
    }

    return acc;
  }, "");

  return `${MARMITON_URL}/recettes/recherche.aspx?${query}`;
};

const scrap = async (url: string): Promise<IRecipe[]> => {
  const browser = await puppeteer.launch({
    // This is needed to run Puppeteer in a Phantombuster container
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForSelector("#__next"); // looks like marmiton is using NextJs

  const recipes = await page.evaluate(
    (selectors: typeof SELECTORS, marmiton_url: string) => {
      // we are in the browser's context
      const data: IRecipe[] = [];
      document.querySelectorAll(selectors.url).forEach((element) => {
        const recipe_url = element.getAttribute("href") || "";
        const name = element.querySelectorAll(selectors.name)[0].innerHTML;
        const rating = element.querySelectorAll(selectors.rating)[0].innerHTML;
        const reviews = element.querySelectorAll(selectors.reviews)[0].innerHTML;
        data.push({
          name,
          url: marmiton_url + recipe_url,
          rating,
          reviews,
        });
      });
      return data;
    },
    SELECTORS,
    MARMITON_URL
  );
  await page.close();
  await browser.close();
  return recipes;
};

const main = async () => {
  // Instantiate the agent
  const agent = new Buster();
  const args = agent.argument;

  // validates argument AJV

  // build query
  const url = get_url(args as IFilter);

  // scrap
  const recipes = await scrap(url);

  console.log("arguments", args);
  console.log("url", recipes);
};

(async () => {
  try {
    await main();
    console.log("Let's cook dem delicious dishes! 🥪");
    process.exit(0);
  } catch (error) {
    console.error(`No cookin for you 😢 : ${error}`);
    process.exit(1);
  }
})();
