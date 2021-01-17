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
$name = document.getElementsByName.bind(document);

// DOM elements
const numbers_input = $id("numbers");
const message_input = $id("message");
const submit_button = $id("submit");
const country_code_dropdown = $id("country_code_dropdown");
const input_container = $(".input_container");
const reset_button = $id("reset");
const random_delay = $id("random_delay");
const number_input_types = [...$name("numberInputType")];
const manuall_container = $id("manuall-container");
const csv_container = $id("csv-container");
const error_container = $id("error_container");
const csv_input = $id("csv_input");
const total_numbers_csv = $id("total_numbers_csv");

// state for form data
const form_data = {
  numbers: [],
  message: "",
  countryCode: "",
  randomDelay: false,
  numberInputType: "",
  numbersViaCSV: [],
};

// first function which runs whenever the popup opens
// sets the initial state
function onLoad() {
  setLocalState("message");
  setLocalState("numbers");
  setLocalState("countryCode");
  setLocalState("randomDelay");
  setLocalState("numberInputType");
  // setLocalState("numbersViaCSV");
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
  }
};

onLoad();

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

const handleFileInput = (e) => {
  const fr = new FileReader();
  fr.onload = () => {
    // console.log(fr.result.split("\n"));
    const rows = fr.result.split("\n");
    const coulmnHeaders = rows[0].split(",");
    const columnNumber = coulmnHeaders.indexOf("Numbers");
    console.log("Column: ", columnNumber);

    total_numbers_csv.classList.remove("hide");

    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].split(",");
      let number = cells[columnNumber];
      number = number.replace("+", "");
      number = number.replace(" ", "");
      // save to local state
      console.log(number);
      if (number !== "" && number.match("[0-9]+")) {
        form_data.numbersViaCSV.push(number);
      }
      // update data in chrom storage
      // chrome.storage.local.set({ numbersViaCSV: form_data.numbersViaCSV });
    }
    total_numbers_csv.innerText = `Total Numbers: ${form_data.numbersViaCSV.length}`;
  };
  fr.readAsText(e.target.files[0]);
};

const handleSubmit = (e) => {
  e.preventDefault();

  // validation
  if (form_data.numberInputType === "") {
    addError("Please select a number input type");
  }
  if (form_data.numberInputType === "manually") {
    if (form_data.countryCode === "") {
      addError("Please select a country code");
      country_code_dropdown.classList.add("error_input");
      return;
    } else {
      country_code_dropdown.classList.remove("error_input");
    }
    if (form_data.numbers.length === 0) {
      addError("Please manually enter phone numbers seperated by commmas (,)");
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
        numbersViaCSV: form_data.numbersViaCSV,
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

random_delay.addEventListener("change", handleChange);

number_input_types.forEach((cur) =>
  cur.addEventListener("change", handleRadio)
);

csv_input.addEventListener("change", handleFileInput);
