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
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { ref, setup, State, Character } from "#test";
import { test } from "bun:test";

test("query: recent opp from", async () => {
  const c = setup(
    <State>
      <Character opp v={{ expected: 1 }} />
      <Character opp />
      <Character opp alive={0} />

      <Character my />
      <Character my />
      <Character my active />
    </State>,
  );
  c.expect("recent opp from my active").toHaveVariable({ expected: 1 });
});
