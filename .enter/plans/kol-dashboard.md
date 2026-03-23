# Fix CSV Import: Parsing Accuracy + Stage Column

## Issues
1. **Name column wrong**: "Final Price", URLs appear as names — header matching too narrow
2. **Missing "进度" (progress) column**: Need to map Chinese status labels to our Stage type
3. **Platform "YouTube - Video"**: Doesn't parse correctly (dash breaks the split)
4. **Missing headers**: "合作内容方向" not matched to contentDirection
5. **addKol always sets writing_idea**: Need to support custom initial stage

## Chinese Status → Stage Mapping
- 待启动 / Pending → writing_idea
- 脚本制作中 / 脚本修改中 → writing_script
- 视频制作中 / 视频修改中 → video_production
- 待发布 → pre_publish
- 已发布 → published

## Changes

### 1. `src/components/agency/CsvImportDialog.tsx`
- **matchHeader**: Add "合作内容方向", "进度"/"progress"/"status"/"stage" header matching
- **parsePlatform**: Pre-clean input — strip " - Video", " - Shorts" etc. before splitting
- **ParsedRow**: Add `stage` field
- **parseTsv**: Map "进度" values to Stage type, include in parsed row
- **Preview table**: Add Stage column
- **handleImport**: Pass `stage` to addKol

### 2. `src/lib/kol-store.tsx`
- **addKol**: Accept optional `initialStage` parameter, default to 'writing_idea'

## Files
1. `src/components/agency/CsvImportDialog.tsx`
2. `src/lib/kol-store.tsx`
