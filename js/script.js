async function loadParts() {

    const elements = document.querySelectorAll("[data-include]");

    for (const element of elements) {

        const file = element.dataset.include;

        const response = await fetch(file);

        element.outerHTML = await response.text();

    }

}

document.addEventListener("DOMContentLoaded", loadParts);