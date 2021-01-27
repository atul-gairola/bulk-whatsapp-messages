// jquery setup
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);
const $id = document.getElementById.bind(document);

// HELPER FUNCTION - delays the execution by given miliseconds
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// waits for an element in the DOM before calling the function
const waitForEl = () => {
  let tries = 0;
  const maxTries = 5000;

  const wait = () => {
    try {
      const el = $id("app").children[0].querySelector("div").children[3];
      if (el) {
        setObserver();
      } else {
        if (tries < maxTries) {
          tries++;
          setTimeout(() => {
            wait();
          }, 100);
        }
      }
    } catch (e) {
      if (tries < maxTries) {
        tries++;
        setTimeout(() => {
          wait();
        }, 100);
      }
    }
  };
  wait();
};

waitForEl();

// listens for the message from popup
chrome.runtime.onMessage.addListener(async (message, sender, response) => {
  if (message.from === "home_popup" && message.subject === "send_message") {
    // send messages through user saved contacts
    if (
      message.numberInputType &&
      message.numberInputType === "whatsappContacts"
    ) {
      await sendMessage(message.message, "");
      return;
    }

    // send messages through csv
    if (
      message.numberInputType === "csv" &&
      message.csv.data.length !== 0 &&
      typeof message.csv.number_column.number === "number"
    ) {
      const { number_column, data } = message.csv;
      console.log(number_column, data);
      for (let i = 1; i < data.length; i++) {
        const numberWithCountryCode = message.csvContainsCodes
          ? formatNumber(data[i][number_column.number])
          : message.countryCode + formatNumber(data[i][number_column.number]);
        // console.log(numberWithCountryCode);
        await sendMessage(message.message, numberWithCountryCode);
        await clickSendButton();
        if (message.randomDelay) {
          await addDelay();
        }
      }
    }
    if (message.numbers.length !== 0) {
      // message to manual input numbers
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

const formatNumber = (numStr) => {
  return numStr.replace(/ /g, "").replace(/\+/g, "").replace(/-/g, "");
};

const addDelay = async () => {
  const randomDelayTime = Math.floor(generateRandomNumber(2, 5) * 1000);
  // console.log("Delay of : ", randomDelayTime);
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

const setObserver = () => {
  // observer
  const chatScreenChangeObserver = new MutationObserver(
    (mutations, observer) => {
      groupChatConatactsDownload();
    }
  );

  chatScreenChangeObserver.observe(
    $id("app").children[0].querySelector("div").children[3],
    {
      childList: true,
    }
  );
};

const groupChatConatactsDownload = () => {
  try {
    const headerEl = $id("app")
      .children[0].querySelector("div")
      .children[3].querySelector("header");

    const groupDetailsContainer = headerEl.children[1];
    const title = groupDetailsContainer.children[0].innerText;
    const members = groupDetailsContainer.children[1].innerText;

    const isAGroupChat =
      (members.startsWith("click here") && members.includes("group")) ||
      members.includes(",");

    // only if the chat is of a group, add group download button
    if (isAGroupChat) {
      addGroupDownloadButton();
    }

    function addGroupDownloadButton() {
      try {
        const buttonId = "w_download_contacts_button";

        const isButtonPresent = headerEl.querySelector(`#${buttonId}`);

        if (!isButtonPresent) {
          const downloadButton = document.createElement("button");
          downloadButton.innerText = "Get Contacts";
          downloadButton.id = buttonId;
          downloadButton.title = "Download group contacts";
          downloadButton.type = "button";
          downloadButton.addEventListener("click", handleGroupContactsDownload);
          headerEl.insertBefore(downloadButton, headerEl.children[2]);
        }
      } catch (e) {
        console.log(e);
      }
    }

    function handleGroupContactsDownload(e) {
      try {
        e.preventDefault();
        const waitForContacts = () => {
          // console.log("waiting");
          if (groupDetailsContainer.children[1].innerText.includes(",")) {
            // console.log(groupDetailsContainer.children[1].innerText);
            downloadAsCSV(
              groupDetailsContainer.children[1].innerText,
              `${title}.csv`
            );
          } else {
            setTimeout(waitForContacts, 200);
          }
        };

        // downloads the members as CSV
        const downloadAsCSV = (members, filename) => {
          let csvFormat = members.replace(/ /g, "");
          csvFormat = csvFormat.replace(",You", "");
          csvFormat = csvFormat.replace(/,/g, "\n");
          const contacts = `Contacts\n${csvFormat}`;

          const blob = new Blob([contacts], {
            type: "text/csv;charset=utf-8;",
          });

          const link = document.createElement("a");
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", filename);
          link.style.visibility = "hidden";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        waitForContacts();
      } catch (e) {
        console.log(e);
      }
    }
  } catch (e) {}
};
