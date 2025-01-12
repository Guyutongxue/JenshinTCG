// Copyright (C) 2024-2025 Guyutongxue
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { defineConfig, presetUno } from "unocss";
import presetUna from "@una-ui/preset";
import presetIcons from "@unocss/preset-icons";

export default defineConfig({
  presets: [
    presetUno(), 
    presetIcons({
      collections: {
        mdi: () => import("@iconify-json/mdi").then((i) => i.icons)
      }
    }),
    (<any>presetUna)({
      primary: "yellow"
    }),
  ],
  content: {
    filesystem: [
      'src/**/*.{html,js,ts,jsx,tsx,vue,svelte,astro}',
    ],
  },
});
