export enum messageId {
  getThumb = "getThumb",
  thumbUrl = "thumbUrl",
  getThumbfinished = "getThumbfinished",
  // Streaming fetch messages
  singleThumbFinished = "singleThumbFinished",
  fetchStarted = "fetchStarted",
  fetchStopped = "fetchStopped",
  stopFetch = "stopFetch",
  // Cover status on matching pages
  coverStatusQuery = "coverStatusQuery",
  coverStatusResult = "coverStatusResult",
}
