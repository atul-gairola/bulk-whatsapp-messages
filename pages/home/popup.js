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
$$ = document.querySelectorAll.bind(document);
$name = document.getElementsByName.bind(document);

// DOM elements
const numbers_input = $id("numbers");
const message_input = $id("message");
const submit_button = $id("submit");
const country_code_dropdown = $$(".country_code_dropdown");
const input_container = $(".input_container");
const reset_button = $id("reset");
const random_delay = $id("random_delay");
const number_input_types = [...$name("numberInputType")];
const manuall_container = $id("manuall-container");
const csv_container = $id("csv-container");
const error_container = $id("error_container");
const total_numbers_csv = $id("total_numbers_csv");
const number_column = $id("number_column");
const add_csv_button = $(".add_csv_button");
const fileNameTag = $(".fileName");
const removeFileButton = $(".removeFile");
const fileSelected = $(".fileSelected");
const csv_contains_codes = $id("csv_contains_codes");
const csv_country_codes = $id("csv_country_codes");
const personalized_msg_chkbox = $id("personalized_msg_chkbox");
const personalized_msg_container = $id("personalized_msg_container");
const select_template_field = $id("select_template_field");
const applyTemplate = $id("applyTemplate");
const stop_button = $id("stop");

// state for form data
const form_data = {
  numbers: [],
  message: "",
  countryCode: "",
  randomDelay: false,
  numberInputType: "",
  csv: {
    name: "",
    data: [],
    number_column: {
      name: "",
      number: "",
    },
  },
  csvContainsCodes: false,
  usePersonalizedMsg: false,
};

// first function which runs whenever the popup opens
// sets the initial state
function onLoad() {
  // check for loading
  chrome.storage.local.get("loading", (res) => {
    if (res.loading) {
      addLoading();
    } else {
      removeLoading();
    }
  });
  setLocalState("message");
  setLocalState("numbers");
  setLocalState("countryCode");
  setLocalState("randomDelay");
  setLocalState("numberInputType");
  setLocalState("csv");
  setLocalState("csvContainsCodes");
  setLocalState("usePersonalizedMsg");
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
      [...country_code_dropdown].forEach((cur) => (cur.value = value));
      break;
    case "numbers":
      value.forEach((cur) => addNumberTag(cur));
      break;
    case "randomDelay":
      random_delay.checked = value;
      break;
    case "numberInputType":
      console.log(number_input_types, value);
      number_input_types.forEach((cur) =>
        cur.value === value ? (cur.checked = true) : null
      );
      if (value === "manually") {
        manuall_container.classList.remove("hide");
      } else {
        manuall_container.classList.add("hide");
      }
      if (value === "csv") {
        csv_container.classList.remove("hide");
      } else {
        csv_container.classList.add("hide");
      }
      break;
    case "csv":
      DOMChangesForFile(true);
      if (value.number_column) number_column.value = value.number_column.name;
      break;
    case "csvContainsCodes":
      csv_contains_codes.checked = value;
      csv_country_codes.disabled = value;
      break;
    case "usePersonalizedMsg":
      personalized_msg_container.classList.toggle("hide", !value);
      personalized_msg_chkbox.checked = value;
      break;
  }
};

onLoad();

function removeLoading() {
  submit_button.classList.remove("hide");
  stop_button.classList.add("hide");
  chrome.storage.local.set({ loading: false });
}

function addLoading() {
  submit_button.classList.add("hide");
  stop_button.classList.remove("hide");
  chrome.storage.local.set({ loading: true });
}

chrome.runtime.onMessage.addListener((message, sender, response) => {
  if (message.messages && message.messages === "sent") {
    removeLoading();
  }
});

const handleChange = (e) => {
  const { name, value } = e.target;
  if (typeof e.target.checked !== "undefined") {
    // set local state
    form_data[name] = e.target.checked;
    // update data in chrome storage
    chrome.storage.local.set({ [name]: e.target.checked });
  } else {
    // set local state
    form_data[name] = String(value);
    // update data in chrome storage
    chrome.storage.local.set({ [name]: value });
  }
};

const handleNumberDropdownChange = (e) => {
  const { value } = e.target;
  const column = form_data.csv.data[0].indexOf(value);
  // set local state
  form_data.csv.number_column = {
    name: value,
    number: column,
  };
  // update chrome storage
  chrome.storage.local.set({ csv: form_data.csv });
};

const switchInputDisability = (isDisabled) => {
  numbers_input.disabled = isDisabled;
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

const handleRadio = (e) => {
  console.log(e.target.value);
  // update local state
  form_data.numberInputType = e.target.value;
  // update data in chrome storage
  chrome.storage.local.set({ numberInputType: e.target.value });

  console.log(form_data);

  if (e.target.value === "manually") {
    manuall_container.classList.remove("hide");
  } else {
    manuall_container.classList.add("hide");
  }

  if (e.target.value === "csv") {
    csv_container.classList.remove("hide");
  } else {
    csv_container.classList.add("hide");
  }
};

const addError = (msg) => {
  error_container.classList.remove("hide");
  error_container.querySelector("p").innerText = msg;
};

const removeError = () => {
  error_container.classList.add("hide");
};

const DOMChangesForFile = (isFileSelected) => {
  if (isFileSelected) {
    add_csv_button.classList.add("hide");
    fileNameTag.classList.remove("hide");
    fileNameTag.innerText = form_data.csv.name;
    removeFileButton.classList.remove("hide");
    fileSelected.classList.remove("hide");
    // create options
    form_data.csv.data[0].forEach((cur) => {
      const option1 = document.createElement("option");
      const option2 = document.createElement("option");
      option1.value = cur;
      option1.innerText = cur;
      option2.value = cur;
      option2.innerText = cur;

      number_column.appendChild(option1);
      // also add to the template drpdown
      select_template_field.appendChild(option2);
    });
  } else {
    add_csv_button.classList.remove("hide");
    fileNameTag.classList.add("hide");
    removeFileButton.classList.add("hide");
    fileSelected.classList.add("hide");
    [...number_column.querySelectorAll("option")].forEach((cur, i) =>
      i !== 0 ? cur.remove() : null
    );
    [...select_template_field.querySelectorAll("option")].forEach((cur, i) =>
      i !== 0 ? cur.remove() : null
    );
  }
};

chrome.runtime.onMessage.addListener((message, sender, response) => {
  if (message.from === "contentScript" && message.type === "fileData") {
    // update local state
    form_data.csv.data = message.data.contents;
    form_data.csv.name = message.data.filename;

    DOMChangesForFile(true);
  }
});


const handleFileRemoval = (e) => {
  e.preventDefault();

  // update local state
  form_data.csv.data = [];
  form_data.csv.name = "";
  form_data.csv.number_column = {
    name: "",
    number: "",
  };

  // update chrome storage
  chrome.storage.local.set({
    csv: null,
  });

  DOMChangesForFile(false);
};

const handleFileContainsCountryCodes = (e) => {
  e.preventDefault();
  const { name } = e.target;
  // set local state
  form_data[name] = e.target.checked;
  // update data in chrome storage
  chrome.storage.local.set({ [name]: e.target.checked });

  csv_country_codes.disabled = e.target.checked;
};

const handlePersonalizedMsgChckBox = (e) => {
  const { name, checked } = e.target;
  // set local state
  form_data[name] = checked;
  // set chrome storage
  chrome.storage.local.set({ [name]: checked });

  personalized_msg_container.classList.toggle("hide", !checked);
};

const handleApplyTemplate = (e) => {
  e.preventDefault();
  console.log(select_template_field.value);
  if (select_template_field.value !== "") {
    message_input.value = `${message_input.value}{{${select_template_field.value}}}`;
  }
};

const handleActions = (e) => {
  e.preventDefault();
  removeLoading();
  chrome.tabs.query(
    {
      active: true,
      currentWindow: true,
    },
    (tabs) =>
      chrome.tabs.sendMessage(tabs[0].id, {
        from: "home_popup",
        subject: "action",
        type: e.target.id,
      })
  );
};

const handleFileUploadWindow = (e) => {
  e.preventDefault();
  chrome.tabs.query(
    {
      active: true,
      currentWindow: true,
    },
    (tabs) =>
      chrome.tabs.sendMessage(tabs[0].id, {
        from: "homePopup",
        type: "action",
        message: "inputFile",
      })
  );
  chrome.runtime.sendMessage({});
};

const handleSubmit = (e) => {
  e.preventDefault();

  // validation
  if (form_data.numberInputType === "") {
    addError("Please select a number input type");
    return;
  }
  if (form_data.numberInputType === "manually") {
    if (form_data.countryCode === "") {
      addError("Please select a country code");
      [...country_code_dropdown].forEach((cur) =>
        cur.classList.add("error_input")
      );
      return;
    } else {
      [...country_code_dropdown].forEach((cur) =>
        cur.classList.remove("error_input")
      );
    }
    if (form_data.numbers.length === 0) {
      addError("Please manually enter phone numbers seperated by commmas (,)");
      input_container.classList.add("error_input");
      return;
    } else {
      input_container.classList.remove("error_input");
    }
  }
  if (form_data.numberInputType === "csv") {
    if (form_data.csv.data.length === 0 || form_data.csv.name === "") {
      addError("Please select a file");
      input_container.classList.add("error_input");
      return;
    } else {
      input_container.classList.remove("error_input");
    }
    if (form_data.countryCode === "" && !form_data.csvContainsCodes) {
      addError(
        "Please select a country code or check the box if the numbers already contain country codes"
      );
      input_container.classList.add("error_input");
      return;
    } else {
      input_container.classList.remove("error_input");
    }
    if (form_data.csv.number_column.name === "") {
      addError("Please select the column name containing numbers");
      input_container.classList.add("error_input");
      return;
    } else {
      input_container.classList.remove("error_input");
    }
  }
  if (form_data.message === "") {
    addError("Your message is empty");
    message_input.classList.add("error_input");
    return;
  } else {
    message_input.classList.remove("error_input");
  }

  // remove all previous errors if none found
  removeError();

  // add loading
  addLoading();

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
        randomDelay: form_data.randomDelay,
        numberInputType: form_data.numberInputType,
        csv: form_data.csv,
        csvContainsCodes: form_data.csvContainsCodes,
        usePersonalizedMsg: form_data.usePersonalizedMsg,
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

[...country_code_dropdown].forEach((cur) =>
  cur.addEventListener("change", handleChange)
);

reset_button.addEventListener("click", handleReset);

random_delay.addEventListener("change", handleChange);

number_input_types.forEach((cur) =>
  cur.addEventListener("change", handleRadio)
);

removeFileButton.addEventListener("click", handleFileRemoval);

number_column.addEventListener("change", handleNumberDropdownChange);

csv_contains_codes.addEventListener("change", handleFileContainsCountryCodes);

personalized_msg_chkbox.addEventListener(
  "change",
  handlePersonalizedMsgChckBox
);

applyTemplate.addEventListener("click", handleApplyTemplate);

stop_button.addEventListener("click", handleActions);

add_csv_button.addEventListener("click", handleFileUploadWindow);
