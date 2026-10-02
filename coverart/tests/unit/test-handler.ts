import { findCoverArt, findReleaseGroupId } from "../../app";
import { expect } from "chai";

const OK_COMPUTER = "b1392450-e666-3926-a536-22c65f834433";

function response(status: number, body?: any) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

// Returns a fake fetch that answers from a URL-prefix -> response map and records calls.
function fakeFetch(routes: Record<string, any>) {
  const calls: { url: string; init: any }[] = [];
  const fn = async (url: string, init?: any) => {
    calls.push({ url, init });
    const prefix = Object.keys(routes).find((p) => url.startsWith(p));
    if (!prefix) throw new Error("Unexpected request to " + url);
    return routes[prefix];
  };
  return { fn, calls };
}

const MB = "https://musicbrainz.org/ws/2/release-group/";
const CAA = "https://coverartarchive.org/release-group/";

describe("Cover art lookup", function () {
  it("finds the release group and returns a Cover Art Archive URL", async () => {
    const { fn, calls } = fakeFetch({
      [MB]: response(200, { "release-groups": [{ id: OK_COMPUTER, score: 100, "primary-type": "Album" }] }),
      [CAA]: response(200, { images: [{ front: false }, { front: true }] }),
    });

    const result = await findCoverArt({ artist: "Radiohead", title: "OK Computer" }, fn);

    expect(result).to.deep.equal({
      musicBrainzId: OK_COMPUTER,
      coverArtUrl: `${CAA}${OK_COMPUTER}/front-500`,
    });
    expect(calls[0].init.headers["User-Agent"]).to.match(/^MusicCatalogueApi\//);
    expect(decodeURIComponent(calls[0].url)).to.contain('releasegroup:"OK Computer" AND artist:"Radiohead"');
  });

  it("escapes quotes in the search terms", async () => {
    const { fn, calls } = fakeFetch({ [MB]: response(200, { "release-groups": [] }) });

    await findReleaseGroupId("Artist", 'Say "Hi"', fn);

    expect(decodeURIComponent(calls[0].url)).to.contain('releasegroup:"Say \\"Hi\\""');
  });

  it("returns no match when the best score is below the threshold", async () => {
    const { fn, calls } = fakeFetch({
      [MB]: response(200, { "release-groups": [{ id: OK_COMPUTER, score: 72 }] }),
    });

    const result = await findCoverArt({ artist: "Radiohead", title: "Okay Computer" }, fn);

    expect(result).to.deep.equal({ musicBrainzId: null, coverArtUrl: null });
    expect(calls).to.have.length(1);
  });

  it("prefers an album over a single with the same score", async () => {
    const { fn } = fakeFetch({
      [MB]: response(200, {
        "release-groups": [
          { id: "single-id", score: 100, "primary-type": "Single" },
          { id: "album-id", score: 100, "primary-type": "Album" },
        ],
      }),
    });

    expect(await findReleaseGroupId("Artist", "Title", fn)).to.equal("album-id");
  });

  it("keeps the MBID but returns no URL when the archive has no cover", async () => {
    const { fn } = fakeFetch({ [CAA]: response(404) });

    const result = await findCoverArt({ musicBrainzId: OK_COMPUTER }, fn);

    expect(result).to.deep.equal({ musicBrainzId: OK_COMPUTER, coverArtUrl: null });
  });

  it("skips the search when an MBID is supplied", async () => {
    const { fn, calls } = fakeFetch({ [CAA]: response(200, { images: [{ front: true }] }) });

    await findCoverArt({ artist: "Radiohead", title: "OK Computer", musicBrainzId: OK_COMPUTER }, fn);

    expect(calls).to.have.length(1);
    expect(calls[0].url).to.equal(CAA + OK_COMPUTER);
  });

  it("throws on transient failures so callers can retry later", async () => {
    const { fn } = fakeFetch({ [MB]: response(503) });

    let error: Error | undefined;
    try {
      await findCoverArt({ artist: "Radiohead", title: "OK Computer" }, fn);
    } catch (e) {
      error = e;
    }
    expect(error && error.message).to.contain("HTTP 503");
  });
});
