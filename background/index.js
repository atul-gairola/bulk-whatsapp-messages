// //  listens for url change and sends a message to the content script
// chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
//   // read changeInfo data and do something with it
//   // like send the new url to contentscripts.js
//   // removes loading on page reload or page traversal
//   console.log("Reload");
//   chrome.storage.local.set({ loading: false });

//   // if (
//   //   typeof changeInfo.url === "string" &&
//   //   changeInfo.url.startsWith("https://web.whatsapp.com/")
//   // ) {
//   //   // page is whatsapp web
//   // }
// });
