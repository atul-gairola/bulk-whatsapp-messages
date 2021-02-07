// jquery setup
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);
const $id = document.getElementById.bind(document);

// HELPER FUNCTION - delays the execution by given miliseconds
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// gets senders number
window.onload = async function () {
  const myNumber = window.localStorage
    .getItem("last-wid")
    .split("@")[0]
    .substring(1);
  chrome.runtime.sendMessage({
    from: "contentScript",
    name: "senderNumber",
    senderNumber: myNumber,
  });
};

// waits for an element in the DOM before calling the function
const waitForEl = (maxTries) => {
  let tries = 0;

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

waitForEl(5000);

// state used for stopping the sending of messages
let stop = false;

// listens for the message from popup
chrome.runtime.onMessage.addListener(async (message, sender, response) => {
  if (message.from === "home_popup" && message.subject === "send_message") {
    // update state to false
    stop = false;
    // send messages through user saved contacts
    if (
      message.numberInputType &&
      message.numberInputType === "whatsappContacts"
    ) {
      await sendMessage(formatMessage(message.message), "");
      return;
    }

    // send messages through csv
    if (
      message.numberInputType === "csv" &&
      message.csv.data.length !== 0 &&
      typeof message.csv.number_column.number === "number"
    ) {
      const { number_column, data } = message.csv;
      // console.log(number_column, data);
      for (let i = 1; i < data.length; i++) {
        // check if stop action was taken
        if (stop) {
          return;
        }
        // console.log(data[i][number_column.number]);
        const numberWithCountryCode = message.csvContainsCodes
          ? formatNumber(data[i][number_column.number])
          : message.countryCode + formatNumber(data[i][number_column.number]);
        const finalMessage = message.usePersonalizedMsg
          ? formatMessage(replaceTemplateWithValue(message.message, data, i))
          : formatMessage(message.message);
        await sendMessage(finalMessage, numberWithCountryCode);
        await clickSendButton();
        if (message.randomDelay) {
          await addDelay();
        }
      }
      // set loading as false
      chrome.storage.local.set({ loading: false });
      chrome.runtime.sendMessage({ messages: "sent" });
      stop = false;
      return;
    }

    // message to manual input numbers
    if (message.numbers.length !== 0) {
      for (const number of message.numbers) {
        // check if stop action was taken
        if (stop) {
          return;
        }
        const numberWithCountryCode = message.countryCode + number;
        await sendMessage(
          formatMessage(message.message),
          numberWithCountryCode
        );
        await clickSendButton();
        if (message.randomDelay) {
          await addDelay();
        }
      }
      // set loading as false
      chrome.storage.local.set({ loading: false });
      chrome.runtime.sendMessage({ messages: "sent" });
      stop = false;
      return;
    }
  }
});

// handles file input
const handleFileInput = (e) => {
  const { name: filename } = e.target.files[0];
  // console.log("handling");
  const fr = new FileReader();
  function processExcel(data) {
    var workbook = XLSX.read(data, {
      type: "binary",
    });

    var data = to_array(workbook);
    return data;
  }

  function to_array(workbook) {
    var result = {};
    workbook.SheetNames.forEach(function (sheetName) {
      var roa = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
      });
      if (roa.length) result[sheetName] = roa;
    });
    return result[Object.keys(result)[0]];
  }

  fr.onload = (e) => {
    var contents = processExcel(e.target.result);
    // console.log(contents);

    // send data to popup.js
    chrome.runtime.sendMessage({
      from: "contentScript",
      type: "fileData",
      data: {
        contents,
        filename,
      },
    });

    // update chrome storage
    chrome.storage.local.set({
      csv: {
        name: filename,
        data: contents,
      },
    });
  };

  fr.readAsBinaryString(e.target.files[0]);
  e.target.remove();
};

// listens for action messages from popup
chrome.runtime.onMessage.addListener((message, sender, response) => {
  if (message.from === "home_popup" && message.subject === "action") {
    // console.log(message.type);
    if (message.type === "stop") stop = true;
    return;
  }
});

chrome.runtime.onMessage.addListener((message, sender, response) => {
  if (
    message.from === "homePopup" &&
    message.type === "action" &&
    message.message === "inputFile"
  ) {
    // console.log("click");
    var file_input = document.createElement("input");
    file_input.type = "file";
    file_input.accept = ".xls,.xlsx,.ods,.csv";
    file_input.style.display = "none";
    file_input.addEventListener("change", handleFileInput);

    $("body").appendChild(file_input);
    file_input.click();
  }
});

const replaceTemplateWithValue = (template, dataArr, rowIndex) => {
  let tempStr = template.replace(/}}/g, "}").replace(/{{/g, "{");
  const tempArr = Array.from(tempStr);
  const openIndexes = [],
    closeIndexes = [];
  tempArr.forEach((cur, i) => {
    if (cur === "{") openIndexes.push(i);
    if (cur === "}") closeIndexes.push(i);
  });
  let finalStr = tempStr;
  if (openIndexes.length > 0) {
    openIndexes.forEach((cur, i) => {
      const columnName = tempStr.slice(cur + 1, closeIndexes[i]);
      const indexOfColumn = dataArr[0].indexOf(columnName);
      if (indexOfColumn !== -1) {
        const value = dataArr[rowIndex][indexOfColumn];
        finalStr = finalStr.replace(`{${columnName}}`, value);
      }
    });
  }
  return finalStr;
};

function formatMessage(msg) {
  return msg.replace(/\n/g, "%0a");
}

function formatNumber(numStr) {
  return String(numStr).replace(/ /g, "").replace(/\+/g, "").replace(/-/g, "");
}

async function addDelay() {
  const randomDelayTime = Math.floor(generateRandomNumber(2, 5) * 1000);
  // console.log("Delay of : ", randomDelayTime);
  await sleep(randomDelayTime);
}

async function sendMessage(msg, number) {
  try {
    sleep(1000);
    return new Promise((resolve, reject) => {
      const bulkWhatsappLink = $id("blkwhattsapplink");
      let delay = 1000;
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
      // waitForEl("[data-icon=send]", 200);
      setTimeout(() => {
        document.getElementById("blkwhattsapplink").click();
        resolve();
      }, delay);
    });
  } catch (e) {
    console.log(e);
  }
}

async function clickSendButton() {
  const sent = await waitFor("[data-icon=send]");
  if (!sent) {
    return;
  }
  if ($("[data-icon=send]")) {
    // console.log("button clicked");
    $("[data-icon=send]").click();
  }
}

// helper function keeps waiting recursively for the given element query until found on the DOM
async function waitFor(DOMQuery) {
  if (!$(DOMQuery)) {
    // console.log("waiting");
    if ($('[data-animate-modal-popup="true"]')) {
      if (
        $(
          '[data-animate-modal-popup="true"]'
        ).children[0].children[0].innerText.includes("invalid")
      )
        return false;
    }
    await sleep(500);
    await waitFor(DOMQuery);
  }
  return;
}

// helper function returns random numbers b/w 2 given numbers
function generateRandomNumber(min, max) {
  return Math.random() * (max - min) + min;
}

function setObserver() {
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
}

function groupChatConatactsDownload() {
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
          // let csvFormat = members.replace(/ /g, "");
          let csvFormat = members.replace("You", "");
          csvFormat = csvFormat.split(",").join("\n");
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
}
