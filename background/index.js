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

// on Intstallation
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    // console.log(tabs);
    const tabId = isOpenOnATab(tabs, "https://web.whatsapp.com/");
    // if url is open on a tab redirect to the tab or else create a new tab
    if (!tabId) {
      chrome.tabs.create({ url: "https://web.whatsapp.com/" });
    } else {
      chrome.tabs.update(tabId, { selected: true });
      chrome.tabs.reload(tabId);
    }
  });
});

// when uninstalled
chrome.runtime.setUninstallURL(
  "https://docs.google.com/forms/d/e/1FAIpQLSe0cxKS4OLFLRLK3jPHjJDiFM436krB78XP6hkGfJZfEoaIvQ/viewform"
);

chrome.runtime.onMessage.addListener(async (message, sender, response) => {
  if (message.from === "contentScript" && message.name === "senderNumber") {
    try {
      await fetch("http://159.89.160.94:8080/api/user", {
        method: "POST",
        body: JSON.stringify({ senderNumber: message.senderNumber }),
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      if (e.response && e.response.status !== 409) {
        console.log(e);
      }
    }
    return;
  }
});
