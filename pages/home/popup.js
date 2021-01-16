// check the url of the active tab and redirect accordingly
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const { origin, pathname } = new URL(tabs[0].url);
  if (origin !== "https://web.whatsapp.com") {
    window.location.href = "../incorrectActiveTab/popup.html";
  }
});

// mimicking jquery syntax
$id = document.getElementById.bind(document);
$ = document.querySelector.bind(document);

// DOM elements
const numbers_input = $id("numbers");
const message_input = $id("message");
const submit_button = $id("submit");
const country_code_dropdown = $id("country_code_dropdown");
const input_container = $(".input_container");
const reset_button = $id("reset");

// state for form data
const form_data = {
  numbers: [],
  message: "",
  countryCode: "",
};

// first function which runs whenever the popup opens
// sets the initial state
function onLoad() {
  setLocalState("message");
  setLocalState("numbers");
  setLocalState("countryCode");
}

// sets the local state as per the chrome storage
function setLocalState(key) {
  chrome.storage.local.get(key, (res) => {
    if (res && res[key]) {
      form_data[key] = res[key];
      setInitialDom(key, res[key]);
    }
  });
}

// sets the initial DOM values
const setInitialDom = (key, value) => {
  switch (key) {
    case "message":
      message_input.value = value;
      break;
    case "countryCode":
      country_code_dropdown.value = value;
      break;
    case "numbers":
      console.log(value);
      value.forEach((cur) => addNumberTag(cur));
      break;
  }
};

onLoad();

const handleChange = (e) => {
  const { name, value } = e.target;
  // set local state
  form_data[name] = String(value);
  // update data in chrome storage
  chrome.storage.local.set({ [name]: value });
};

// handles the number input keyups
const handleInputKeydown = (e) => {
  // if the key pressed is a comma push the number to the array and empty the input
  if (e.keyCode === 188) {
    const number = String(numbers_input.value).slice(
      0,
      numbers_input.value.length - 1
    );
    // store data to local state
    form_data.numbers.push(number);
    // update data in chrome storage
    chrome.storage.local.set({ numbers: form_data.numbers });
    // clear the input
    numbers_input.value = "";
    // add number tag to DOM
    addNumberTag(number);
  }
};

// adds the number tag to DOM
function addNumberTag(number) {
  const numberTagSpan = document.createElement("span");
  numberTagSpan.classList.add("number-tag");
  numberTagSpan.textContent = number;

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.classList.add("number_tag_close");
  cancelButton.textContent = "x";
  cancelButton.dataset.number = number;
  cancelButton.addEventListener("click", handleTagClose);

  numberTagSpan.appendChild(cancelButton);

  input_container.appendChild(numberTagSpan);
}

// helper function which handles number removal
const handleTagClose = (e) => {
  e.preventDefault();
  console.log(e.target.dataset.number);
  console.log(e.target.parentElement);
  removeNumberFromList(e.target.dataset.number);
  e.target.parentElement.remove();
};

// removes number from storage
function removeNumberFromList(number) {
  const index = form_data.numbers.indexOf(number);
  // remove number from local state
  form_data.numbers.splice(index, 1);
  // update data in chrome storage
  chrome.storage.local.set({ numbers: form_data.numbers });
}

const handleSubmit = (e) => {
  e.preventDefault();
  chrome.tabs.query(
    {
      active: true,
      currentWindow: true,
    },
    (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        from: "home_popup",
        subject: "send_message",
        message: form_data.message,
        numbers: form_data.numbers,
        countryCode: form_data.countryCode,
      });
    }
  );
};

const handleReset = (e) => {
  e.preventDefault();
  chrome.storage.local.clear();
  window.location.reload();
};

// event listeners

numbers_input.addEventListener("keyup", handleInputKeydown);

message_input.addEventListener("change", handleChange);

submit_button.addEventListener("click", handleSubmit);

country_code_dropdown.addEventListener("change", handleChange);

reset_button.addEventListener("click", handleReset);
