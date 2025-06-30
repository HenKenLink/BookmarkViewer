// async function fetchHtml(url) {
//   try {
//     const response = await fetch(url, {
//       method: "GET",
//       headers: {
//         "User-Agent":
//           "Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0",
//         Accept:
//           "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
//         "Accept-Language": "en-US,en;q=0.5",
//         "Accept-Encoding": "gzip",
//         Referer: "https://www.boyfriendtv.com/",
//         Connection: "keep-alive",
//         "Upgrade-Insecure-Requests": "1",
//         "Sec-Fetch-Dest": "document",
//         "Sec-Fetch-Mode": "navigate",
//         "Sec-Fetch-Site": "same-origin",
//         "Sec-Fetch-User": "?1",
//         Priority: "u=0, i",
//         Pragma: "no-cache",
//         "Cache-Control": "no-cache",
//         TE: "trailers",
//       },
//     });

//     const data = await response.text();

//     // console.log("Html response: ", data);

//     return data; // 一定要返回字符串
//   } catch (error) {
//     console.error("Error:", error);
//     throw error; // 抛出异常让调用方知道请求失败
//   }
// }

// function extractThumbUrl(html) {
//   const parser = new DOMParser();
//   const doc = parser.parseFromString(html, "text/html");

//   const scriptTag = doc.querySelector('script[type="application/ld+json"]');
//   if (!scriptTag) {
//     throw new Error("Fail to get script tag.");
//   }

//   let jsonData;
//   if (scriptTag.textContent) {
//     try {
//       jsonData = JSON.parse(scriptTag.textContent);
//     } catch (e) {
//       throw new Error("Fail to parse json data.");
//     }
//   } else {
//     throw new Error("Fail to get textContent from script tag.");
//   }
//   // console.log("jsonData: ", jsonData);

//   const thumbUrl = jsonData.thumbnailUrl[0];
//   // console.log("thumbUrl: ", thumbUrl);
//   return thumbUrl || null;
// }

// async function fetchThumb(pageUrlList, messageId) {
//   for (const url of pageUrlList) {
//     console.log("URL: ", url);
//     const data = await fetchHtml(url);
//     const thumbUrl = extractThumbUrl(data);
//     return thumbUrl;
//     // browser.runtime.sendMessage({
//     //   type: messageId.thumbUrl,
//     //   thumbUrl: thumbUrl,
//     //   pageUrl: url,
//     // });
//   }
// }
// async function main(pageUrlList, messageId) {
//   console.log("Start to run inject scripts.");
//   thumbUrl = await fetchThumb(pageUrlList, messageId);
//   return thumbUrl;
// }

// await main();

// // async function main() {
// //     console.log("Start to run content scripts.");
// //     browser.runtime.onMessage.addListener(async (message, sender) => {
// //         if (message.type === messageId.getThumb) {
// //         console.log(
// //             `Message from ${sender.tab} received.Start to get thumbnail.`
// //         );
// //         const pageUrlList = message.pageUrlList;
// //         await fetchThumb(pageUrlList);
// //         return true;
// //         }
// //     });
// // }

// // await main()

async function fetchHtml(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip",
        Referer: "https://www.boyfriendtv.com/",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        Priority: "u=0, i",
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
        TE: "trailers",
      },
    });

    const data = await response.text();

    console.log("Html response: ", data);

    return data; // 一定要返回字符串
  } catch (error) {
    console.error("Error:", error);
    throw error; // 抛出异常让调用方知道请求失败
  }
}

function extractThumbUrl(html) {
  console.log("Start to parse html.");
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const scriptTag = doc.querySelector('script[type="application/ld+json"]');
  if (!scriptTag) {
    console.error("Fail to get script tag.");
    return null;
  }

  let jsonData;
  if (scriptTag.textContent) {
    try {
      jsonData = JSON.parse(scriptTag.textContent);
    } catch (e) {
      console.error("Fail to parse json data.");
      return null;
    }
  } else {
    console.error("Fail to get textContent from script tag.");
    return null;
  }
  // console.log("jsonData: ", jsonData);

  const thumbUrl = jsonData.thumbnailUrl[0];
  console.log("thumbUrl: ", thumbUrl);
  return thumbUrl;
}

async function fetchThumb(pageUrlList) {
  const thumbList = [];
  for (const pageUrl of pageUrlList) {
    const data = await fetchHtml(pageUrl);
    const thumbUrl = extractThumbUrl(data);
    if (!thumbUrl) {
      console.log("Fail to get thumbUrl, continue.");
      continue;
    }
    const thumb = { pageUrl: pageUrl, thumbUrl: thumbUrl };
    thumbList.push(thumb);
  }
  return thumbList;
}
async function main(pageUrlList) {
  console.log("Start to run inject scripts.");
  const thumbList = await fetchThumb(pageUrlList);
  console.log("Script execute result -> thumbList: ", thumbList);
  return thumbList;
}

return main(pageUrlList);
