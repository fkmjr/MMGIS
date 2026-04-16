import { test, expect } from '@playwright/test';

test.describe('Draw Tool', () => {
  test('science target plugin edits and persists target properties', async ({
    page,
  }) => {
    const suffix = Date.now();
    const username = `drawplugin${suffix}`;
    const password = 'Aa1!Aa1!Aa1!';
    const fileName = `Target Plugin Test ${suffix}`;
    const featureName = `Target Feature ${suffix}`;

    await page.goto('/?mission=Reference-Mission');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.locator('#toolButtonDraw').click();
    await expect(page.locator('#drawTool')).toBeVisible();

    await page.evaluate(async ({ username, password, fileName, featureName }) => {
      window.mmgisglobal.test = true;

      const postForm = async (url, body) => {
        const response = await window.fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          },
          body: new URLSearchParams(body),
        });
        return response.json();
      };

      const signupBody = await postForm('/api/users/signup', {
        username,
        email: `${username}@example.com`,
        password,
        mission: 'Reference-Mission',
      });
      if (signupBody?.status !== 'success') {
        throw new Error(
          `users/signup failed: ${JSON.stringify(signupBody)}`
        );
      }
      window.mmgisglobal.user = username;

      const makeFileBody = await postForm('/api/files/make', {
        file_name: fileName,
        intent: 'all',
        test: 'true',
      });
      if (makeFileBody?.status !== 'success') {
        throw new Error(
          `files/make failed: ${JSON.stringify(makeFileBody)}`
        );
      }

      const fileId = makeFileBody.body.file_id;

      const addFeatureBody = await postForm('/api/draw/add', {
        file_id: `${fileId}`,
        intent: 'polygon',
        properties: JSON.stringify({
          name: featureName,
          description: 'Seeded target feature',
          is_target: true,
          target_type: 'Sample',
          style: {
            color: '#ff0000',
            opacity: 1,
            weight: 4,
            fillColor: '#ff0000',
            fillOpacity: 0.4,
          },
        }),
        geometry: JSON.stringify({
          type: 'Polygon',
          coordinates: [
            [
              [-122.41, 37.79],
              [-122.405, 37.79],
              [-122.405, 37.785],
              [-122.41, 37.785],
              [-122.41, 37.79],
            ],
          ],
        }),
        test: 'true',
      });
      if (addFeatureBody?.status !== 'success') {
        throw new Error(
          `draw/add failed: ${JSON.stringify(addFeatureBody)}`
        );
      }

      const drawTool = window.ToolController_.getTool('DrawTool');
      await new Promise((resolve) => {
        drawTool.getFiles(() => {
          drawTool.populateFiles();
          resolve();
        });
      });

      const notLoggedInOverlay =
        window.document.getElementById('drawToolNotLoggedIn');
      if (notLoggedInOverlay) notLoggedInOverlay.style.display = 'none';
    }, { username, password, fileName, featureName });

    await page.locator('#drawToolDrawGroupingDiv > div[type="none"]').click();

    const fileRow = page.locator(
      `#drawToolDrawFilesList .drawToolDrawFilesListElem[file_name="${fileName}"]`
    );
    await expect(fileRow).toBeVisible({ timeout: 15000 });

    await fileRow.locator('.drawToolFileSelector').click();

    const fileCheckbox = fileRow.locator('.drawToolFileCheckbox');
    if (!(await fileCheckbox.evaluate((el) => el.classList.contains('on')))) {
      await fileCheckbox.click();
    }

    await page.locator('.drawToolNavButton[title="Features"]').click();

    const featureRow = page
      .locator('#drawToolShapesFeaturesList .drawToolShapeLi')
      .filter({ hasText: featureName });
    await expect(featureRow).toBeVisible({ timeout: 15000 });
    await featureRow.locator('.drawToolShapeLiItem').click();

    const targetTabButton = page.locator(
      '.drawToolContextMenuTabButtons .drawToolContextMenuTabButton[title="Target"]'
    );
    await expect(targetTabButton).toBeVisible();
    await targetTabButton.click();

    const targetCheckbox = page.locator('#drawToolContextMenuTargetIsTarget');
    const targetTypeSelect = page.locator('#drawToolContextMenuTargetType');

    await expect(targetCheckbox).toBeChecked();
    await expect(targetTypeSelect).toHaveValue('Sample');

    await targetTypeSelect.selectOption('Observation');

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/draw/edit') &&
          response.request().method() === 'POST' &&
          response.status() === 200
      ),
      page.locator('.drawToolContextMenuSaveChanges').click(),
    ]);

    const savedFeature = await page.evaluate(async ({ fileName, featureName }) => {
      const fileRow = document.querySelector(
        `#drawToolDrawFilesList .drawToolDrawFilesListElem[file_name="${fileName}"]`
      );
      const fileId = fileRow?.getAttribute('file_id');

      const response = await window.fetch('/api/files/getfile', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: new URLSearchParams({
          id: fileId,
          test: 'true',
        }),
      });
      const fileBody = await response.json();

      return fileBody.body.geojson.features.find(
        (feature) => feature.properties.name === featureName
      );
    }, { fileName, featureName });

    expect(savedFeature).toBeTruthy();
    expect(savedFeature.properties.is_target).toBe(true);
    expect(savedFeature.properties.target_type).toBe('Observation');

    await page.locator('.drawToolContextMenuHeaderClose').click();
    await featureRow.locator('.drawToolShapeLiItem').click();
    await targetTabButton.click();

    await expect(targetCheckbox).toBeChecked();
    await expect(targetTypeSelect).toHaveValue('Observation');
  });
});
