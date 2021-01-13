// check the url of the active tab and redirect accordingly
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const { origin, pathname } = new URL(tabs[0].url);
  if (origin === "https://web.whatsapp.com") {
    window.location.href = "../home/popup.html";
  }
});

const $id = document.getElementById.bind(document);

const redirect_button = $id("redirect");

// checks if the url is on any of the open tabs and returns the index of the tab if so
const isOpenOnATab = (tabs, url) => {
  let tabId;
  tabs.forEach((cur) => {
    if (cur.url.startsWith(url)) {
      tabId = cur.id;
    }
  });
  return tabId;
};

redirect_button.addEventListener("click", () => {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    // console.log(tabs);
    const tabId = isOpenOnATab(tabs, "https://web.whatsapp.com/");
    // if url is open on a tab redirect to the tab or else create a new tab
    if (!tabId) {
      chrome.tabs.create({ url: "https://web.whatsapp.com/" });
    } else {
      chrome.tabs.update(tabId, { selected: true });
    }
  });
});
