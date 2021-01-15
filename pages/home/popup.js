// check the url of the active tab and redirect accordingly
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const { origin, pathname } = new URL(tabs[0].url);
  if (origin !== "https://web.whatsapp.com") {
    window.location.href = "../incorrectActiveTab/popup.html";
  }
});

// mimicking jquery syntax
$id = document.getElementById.bind(document);

// DOM elements
const numbers_input = $id("numbers");
const message_input = $id("message");
const submit_button = $id("submit");
const country_code_dropdown = $id("country_code_dropdown");

// state for form data
const form_data = {
  numbers: "",
  message: "",
  countryCode: "",
};

const handleChange = (e) => {
  const { name, value } = e.target;
  form_data[name] = value;
  console.log(form_data);
};

const handleCountryCodes = (e) => {
  const { value } = e.target;
  console.log(value);
};

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

numbers_input.addEventListener("change", handleChange);

message_input.addEventListener("change", handleChange);

submit_button.addEventListener("click", handleSubmit);

country_code_dropdown.addEventListener("change", handleChange);
