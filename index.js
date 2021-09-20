const express = require("express");
const puppeteer = require("puppeteer-extra").default;
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
const Redis = require("ioredis");

const app = express();
app.set("port", process.env.PORT);

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin());

const options = { timeout: process.env.TIMEOUT };

const redis = new Redis(process.env.REDIS_URL);

const searchUrl = (deviceModel) =>
  `${process.env.SEARCH_URL_PREFIX}${deviceModel}`;

const crawling = async (deviceModel) => {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  });

  const page = await browser.newPage();

  try {
    await page.goto(searchUrl(deviceModel), options);
    await page.waitForSelector("#review-body ul li a", {
      ...options,
      visible: true,
    });
  } catch (e) {
    console.error(e);
    await page.close();
    await browser.close();
    return [];
  }

  const detailUrls = await page.evaluate(() =>
    [...document.querySelectorAll("#review-body ul li a")].map(
      (anchor) => anchor.href
    )
  );

  const result = [];
  for (const url of detailUrls) {
    try {
      await page.goto(url, options);
      await page.waitForSelector("#specs-list", { ...options, visible: true });
      result.push({
        deviceModel,
        ...(await page.evaluate(() => ({
          device: document.querySelector("[data-spec=modelname]").textContent,
          resolution: document.querySelector("[data-spec=displayresolution]")
            .textContent,
        }))),
      });
    } catch (e) {
      console.error(e);
      continue;
    }
  }

  await page.close();
  await browser.close();

  try {
    await redis.set(deviceModel, JSON.stringify(result));
  } catch (e) {
    console.error(e);
  }

  return result;
};

const handler = async (req, res, jsonResponse) => {
  if (!req.query || !req.query.device_model) {
    res.statusCode = 400;
    res.end("the device_model param must be present.");
  } else {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.json(jsonResponse);
  }
};

app.get(
  "/api",
  async (req, res) =>
    await handler(
      req,
      res,
      JSON.parse(await redis.get(req.query.device_model)) ||
        (await crawling(req.query.device_model))
    )
);

app.get(
  "/clear",
  async (req, res) =>
    await handler(req, res, await redis.del(req.query.device_model))
);

app.listen(app.get("port"), () =>
  console.log("app running on port", app.get("port"))
);
