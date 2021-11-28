"phantombuster package: 5";
"phantombuster command: nodejs";
"phantombuster flags: save-folder";

import Buster from "phantombuster";
import puppeteer from "puppeteer";
import Ajv from "ajv";

const MARMITON_URL = "https://www.marmiton.org";

// the class names are obfuscated
const SELECTORS: Record<keyof IRecipe, string> = {
  name: ".MRTN__sc-30rwkm-0",
  url: ".MRTN__sc-1gofnyi-2",
  rating: ".SHRD__sc-10plygc-0",
  reviews: ".MRTN__sc-30rwkm-3",
};

const _filterType = [
  "entree",
  "platprincipal",
  "dessert",
  "amusegueule",
  "sauce",
  "accompagnement",
  "boisson",
  "confiserie",
] as const;
const _filterDifficulty = [1, 2, 3, 4] as const;
const _filterExpense = [1, 2, 3] as const;
const _filterParticularity = [1, 2, 3, 4, 5] as const;
const _filterCooking = [1, 2, 3, 4, 5] as const;
const _filterTime = [15, 30, 45] as const;

const ARGS_SCHEMA = {
  title: "Args",
  description: "Marmiton search args",
  type: "object",
  properties: {
    search: { type: "string" },
    type: {
      type: "array",
      items: {
        type: "string",
        enum: _filterType,
      },
    },
    difficulty: {
      type: "array",
      items: {
        type: "number",
        enum: _filterDifficulty,
      },
    },
    expense: {
      type: "array",
      items: {
        type: "number",
        enum: _filterExpense,
      },
    },
    particularity: {
      type: "array",
      items: {
        type: "number",
        enum: _filterParticularity,
      },
    },
    cooking: {
      type: "array",
      items: {
        type: "number",
        enum: _filterCooking,
      },
    },
    time: {
      type: "array",
      items: {
        type: "number",
        enum: _filterTime,
      },
    },
  },
  required: ["search"],
};

// Represents a scrapped recipe from marmiton website
interface IRecipe {
  name: string;
  url: string;
  rating: number;
  reviews: number;
}

// Search parameters
interface IFilter {
  search: string; // aqt
  type?: typeof _filterType[number][]; // dt
  difficulty?: typeof _filterDifficulty[number][]; // dif
  expense?: typeof _filterExpense[number][]; // exp
  particularity?: typeof _filterParticularity[number][]; // prt
  cooking?: typeof _filterCooking[number][]; // rct
  time?: typeof _filterTime[number][]; // ttlt
}

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

// add pages
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
          rating: Number(rating.replace(/[^0-9.]/g, "").slice(0, -1)),
          reviews: Number(reviews.replace(/\D/g, "")),
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const validate = (args: any): IFilter => {
  const ajv = Ajv({ allErrors: true });
  const valid = ajv.validate(ARGS_SCHEMA, args);

  if (valid) {
    return {
      search: args["search"],
      type: args["type"],
      difficulty: args["difficulty"],
      expense: args["expense"],
      cooking: args["cooking"],
      time: args["time"],
    };
  } else {
    throw ajv.errors;
  }
};

const main = async () => {
  // Instantiate the agent
  const agent = new Buster();

  // Validates args
  const args = validate(agent.argument);

  // Build query
  const url = get_url(args);

  // Scrap
  const recipes = await scrap(url);

  // Save in resultObject
  await agent.setResultObject(recipes);

  // const json_url = await agent.saveText(
  //   JSON.stringify(recipes),
  //   "recipes.json",
  //   "application/json"
  // );
  // return json_url;
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
