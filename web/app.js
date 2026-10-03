import { estimateBatch, estimatesToCsv } from "./api.js";

const input = document.querySelector("#projects");
const output = document.querySelector("#output");
const message = document.querySelector("#message");
const download = document.querySelector("#download");
let estimates = null;
input.addEventListener("input", () => { estimates = null; download.disabled = true; });
document.querySelector("#calculate").addEventListener("click", () => {
  try {
    estimates = estimateBatch(JSON.parse(input.value));
    output.textContent = JSON.stringify(estimates, null, 2);
    message.textContent = "";
    download.disabled = false;
  } catch (error) {
    estimates = null;
    download.disabled = true;
    message.textContent = error.message;
    output.textContent = "Correct the input to calculate this job list.";
  }
});
download.addEventListener("click", () => {
  if (!estimates) return;
  const url = URL.createObjectURL(new Blob([estimatesToCsv(estimates)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "epoxy-estimates.csv";
  link.click();
  URL.revokeObjectURL(url);
});
