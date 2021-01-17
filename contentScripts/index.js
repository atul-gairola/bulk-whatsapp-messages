// jquery setup
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);
const $id = document.getElementById.bind(document);

// HELPER FUNCTION - delays the execution by given miliseconds
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// listens for the message from popup
chrome.runtime.onMessage.addListener(async (message, sender, response) => {
  if (message.from === "home_popup" && message.subject === "send_message") {
    if (
      message.numberInputType &&
      message.numberInputType === "whatsappContacts"
    ) {
      await sendMessage(message.message, "");
      return;
    }
    if (message.numbers.length !== 0) {
      for (const number of message.numbers) {
        const numberWithCountryCode = message.countryCode + number;
        await sendMessage(message.message, numberWithCountryCode);
        await clickSendButton();
        if (message.randomDelay) {
          await addDelay();
        }
      }
    }
  }
});

const addDelay = async () => {
  const randomDelayTime = Math.floor(generateRandomNumber(2, 5) * 1000);
  console.log("Delay of : ", randomDelayTime);
  await sleep(randomDelayTime);
};

async function sendMessage(msg, number) {
  return new Promise((resolve, reject) => {
    const bulkWhatsappLink = $id("blkwhattsapplink");
    if (bulkWhatsappLink) {
      bulkWhatsappLink.setAttribute(
        "href",
        `https://wa.me/${number}?text=${msg}`
      );
    } else {
      const spanHtml = `<a href="https://wa.me/${number}?text=${msg}" id= "blkwhattsapplink"></a>`;
      const spans = $$("#app .app-wrapper-web span");
      spans[4].innerHTML = spanHtml;
    }

    setTimeout(() => {
      document.getElementById("blkwhattsapplink").click();
      resolve();
    }, 1000);
  });
}

async function clickSendButton() {
  await waitFor("[data-icon=send]");
  if ($("[data-icon=send]")) {
    $("[data-icon=send]").click();
  }
}

// helper function keeps waiting recursively for the given element query until found on the DOM
async function waitFor(DOMQuery) {
  if (!$(DOMQuery)) {
    setTimeout(async function () {
      await waitFor(DOMQuery);
    }, 500);
  }
  return;
}

// helper function returns random numbers b/w 2 given numbers
function generateRandomNumber(min, max) {
  return Math.random() * (max - min) + min;
}
