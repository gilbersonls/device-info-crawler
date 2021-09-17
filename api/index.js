const puppeteer = require("puppeteer-extra").default;
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
const app = require("express")();

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin());

const searchUrl = (deviceModel) =>
  `https://www.gsmarena.com/res.php3?sSearch=${deviceModel}`;

const crawling = async (deviceModel) => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(searchUrl(deviceModel));
  await page.waitForSelector("#review-body", { visible: true });

  const detailUrls = await page.evaluate(() =>
    [...document.querySelectorAll("#review-body ul li a")].map(
      (anchor) => anchor.href
    )
  );

  const result = [];
  for (const url of detailUrls) {
    await page.goto(url);
    await page.waitForSelector("#specs-list", { visible: true });

    result.push({
      deviceModel,
      ...(await page.evaluate(() => ({
        device: document.querySelector("[data-spec=modelname]").textContent,
        resolution: document.querySelector("[data-spec=displayresolution]")
          .textContent,
      }))),
    });
  }

  await page.close();
  await browser.close();
  return result;
};

app.get("/api", async (req, res) => {
  if (!req.query || !req.query.device_model)
    throw new Error("the device_model param must be present.");

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.json(await crawling(req.query.device_model));
});

module.exports = app;
