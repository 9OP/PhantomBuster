# Scraping marmiton

**Requirements: nodeJs + npm**

## Build the phantom

The phantom lives in `src/index.ts`. It is a single typescript file that handles the parsing and validation of the buster arguments, and scrapping of marmiton.

In order to use this phantom on your own phantombuster account, you should:

```sh
npm install # install the types and phantombuster sdk
npm run dev # start concurently the typescript watcher and the phantombuster sdk
```

You should also edit the file `phantombuster.cson` and use you own `apiKey`

## Interracts with the agent

You can interract with the agent directly via the phantombuster api ([docs here](https://hub.phantombuster.com/reference/getagentrecord-1))

I already created the agent and you can directly use my `apiKey` to interract with the api, instead of buidling your own agent:

```sh
export AGENT_ID=611578771167533
export API_KEY=GfFFvxflTIR6VDXwdsCGotU0Qv0FJla82aWXOGnxMyo
```

**Launch agent:**

```sh
CONTAINER_ID=$(curl --request POST \
     --url https://api.phantombuster.com/api/v2/agents/launch \
     --header "Content-Type: application/json" \
     --header "X-Phantombuster-Key: $API_KEY" \
     --data '
{
     "arguments": {
          "search": "poulet coco",
          "page": [1, 2],
          "difficulty": [1, 2]
     },
     "id": "'$AGENT_ID'"
}
' | sed 's/["{}]//g' | awk '{split($0,a,":"); print a[2]}')
```

**Get agent result:**

```sh
curl --request GET \
     --url "https://api.phantombuster.com/api/v2/containers/fetch-result-object?id=$CONTAINER_ID" \
     --header "Accept: application/json" \
     --header "X-Phantombuster-Key:  $API_KEY" \
     | python3 -c "import sys, json; print(json.load(sys.stdin)['resultObject'])" > recipes.json
```

### Side notes:

- API key should not be distributed to untrusted users (it should only be stored/used by a server) and clients should not have access to it.
- I had an issue with `"phantombuster package: 6";` puppeteer module was not found. I used version 5 instead. I think this is a package version issue, but I am not sure.
- The parsing / validation of filters is not user friendly, we could improve the error message from ajv, and use better enums than numbers for difficulty, particularity etc...
- I spent easily 6hours on this, the most difficult part was the setup, and the ramp up on Phantombuster flow. The actual scrapping was straighforward.
