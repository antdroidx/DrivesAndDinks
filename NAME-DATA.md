# Name data sources

`src/name-data.js` is generated from the following source snapshots:

- Male and female first names: [Daniel Caspi's SSA baby-name CSV mirror](https://github.com/dxdc/babynames), derived from U.S. Social Security Administration public data. The mirror is MIT licensed; its notice is reproduced below.
- Surnames: [U.S. Census Bureau 2010 surname data](https://www.census.gov/topics/population/genealogy/data/2010_surnames.html), a public-use U.S. government dataset.
- Additional male first names and surnames: user-supplied `CollegeFootballDynastyManager` string resources.

Names are title-cased, filtered to letters and hyphens, deduplicated, and bundled locally. Runtime name generation never calls the network.

## MIT notice

MIT License

Copyright (c) 2022 Daniel Caspi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
