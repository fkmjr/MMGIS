import $ from 'jquery'

let DrawTool = null

const TAB_NAME = 'ScienceTargets'
const TARGET_TYPE_OPTIONS = [
    'Observation',
    'Sample',
    'Outcrop',
    'Contact',
    'Waypoint',
]

const ScienceTargets = {
    init: function (tool) {
        DrawTool = tool

        DrawTool.plugins[TAB_NAME] = {
            getTabButton: ScienceTargets.getTabButton,
            getUI: ScienceTargets.getUI,
            addEvents: ScienceTargets.addEvents,
            custom: {
                serializeProperties: ScienceTargets.serializeProperties,
                updateUi: ScienceTargets.updateUi,
            },
        }
    },
    getTabButton: function () {
        return "<div class='drawToolContextMenuTabButton' tab='drawToolContextMenuTabScienceTargets' title='Target'><i class='mdi mdi-crosshairs-gps mdi-24px'></i></div>"
    },
    getUI: function () {
        const properties = DrawTool.contextMenuLayer?.feature?.properties || {}
        const isTarget = properties.is_target === true
        const targetType =
            properties.target_type != null
                ? String(properties.target_type).trim()
                : ''

        const options = ["<option value=''>None</option>"]
        const optionValues = [...TARGET_TYPE_OPTIONS]
        if (targetType !== '' && !optionValues.includes(targetType))
            optionValues.push(targetType)

        optionValues.forEach((optionValue) => {
            options.push(
                `<option value='${ScienceTargets.escapeAttribute(
                    optionValue
                )}'${targetType === optionValue ? ' selected' : ''}>${ScienceTargets.escapeHtml(
                    optionValue
                )}</option>`
            )
        })

        return [
            "<div class='drawToolContextMenuTarget'>",
            "<div class='drawToolContextMenuTargetTitle'>Science Target</div>",
            "<div class='drawToolContextMenuTargetSubtitle'>Tag this feature as a science target and assign a target type.</div>",
            "<label class='drawToolContextMenuTargetRow drawToolContextMenuTargetCheckboxRow'>",
            "<div class='drawToolContextMenuTargetLabel'>Mark as target</div>",
            `<div class='mmgis-checkbox small'><input type='checkbox' id='drawToolContextMenuTargetIsTarget' ${
                isTarget ? 'checked' : ''
            } /><label for='drawToolContextMenuTargetIsTarget'></label></div>`,
            '</label>',
            "<div class='drawToolContextMenuTargetRow drawToolContextMenuTargetTypeRow'>",
            "<div class='drawToolContextMenuTargetLabel'>Target Type</div>",
            "<select id='drawToolContextMenuTargetType'>",
            options.join('\n'),
            '</select>',
            '</div>',
            '</div>',
        ].join('\n')
    },
    addEvents: function () {
        DrawTool.contextMenuChanges.props.is_target =
            DrawTool.contextMenuChanges.props.is_target === true
        DrawTool.contextMenuChanges.props.target_type =
            DrawTool.contextMenuChanges.props.target_type === true

        $('#drawToolContextMenuTargetIsTarget')
            .off('change.scienceTargets')
            .on('change.scienceTargets', function () {
                const checked = $(this).is(':checked')
                DrawTool.contextMenuChanges.props.is_target = true

                if (!checked) {
                    $('#drawToolContextMenuTargetType').val('')
                    DrawTool.contextMenuChanges.props.target_type = true
                }

                ScienceTargets.updateUi({
                    is_target: checked,
                    target_type: checked
                        ? $('#drawToolContextMenuTargetType').val()
                        : '',
                })
            })

        $('#drawToolContextMenuTargetType')
            .off('change.scienceTargets')
            .on('change.scienceTargets', function () {
                const value = ($(this).val() || '').trim()
                DrawTool.contextMenuChanges.props.target_type = true

                if (value !== '') {
                    $('#drawToolContextMenuTargetIsTarget').prop('checked', true)
                    DrawTool.contextMenuChanges.props.is_target = true
                }

                ScienceTargets.updateUi({
                    is_target: $('#drawToolContextMenuTargetIsTarget').is(
                        ':checked'
                    ),
                    target_type: value,
                })
            })

        ScienceTargets.updateUi(
            DrawTool.contextMenuLayer?.feature?.properties || {}
        )
    },
    serializeProperties: function ({ force, newProperties }) {
        const isTargetChanged = DrawTool.contextMenuChanges.props.is_target
        const targetTypeChanged =
            DrawTool.contextMenuChanges.props.target_type

        if (!force && !isTargetChanged && !targetTypeChanged) return {}

        const serializedProperties = {}
        const isTarget = $('#drawToolContextMenuTargetIsTarget').is(':checked')
        const targetType = ($('#drawToolContextMenuTargetType').val() || '')
            .trim()

        serializedProperties.is_target = isTarget
        if (isTarget === true && targetType !== '')
            serializedProperties.target_type = targetType
        else {
            delete serializedProperties.target_type
            delete newProperties.target_type
        }

        return serializedProperties
    },
    updateUi: function (sourceProperties) {
        const properties = DrawTool.contextMenuLayer?.feature?.properties || {}
        const isTarget = sourceProperties?.is_target === true
        const targetType =
            sourceProperties?.target_type != null
                ? String(sourceProperties.target_type).trim()
                : ''

        ScienceTargets.ensureTargetTypeOption(targetType)
        $('#drawToolContextMenuTargetIsTarget').prop('checked', isTarget)
        $('#drawToolContextMenuTargetType').val(targetType)
        $('#drawToolContextMenuTargetType').prop('disabled', !isTarget)

        const initialTargetType =
            properties.target_type != null
                ? String(properties.target_type).trim()
                : ''

        $('.drawToolContextMenuTargetCheckboxRow').css(
            'border-bottom',
            isTarget !== (properties.is_target === true)
                ? DrawTool.highlightBorder
                : 'inherit'
        )
        $('.drawToolContextMenuTargetTypeRow').css(
            'border-bottom',
            targetType !== initialTargetType
                ? DrawTool.highlightBorder
                : 'inherit'
        )

        $('.drawToolContextMenuTargetCheckboxRow').css(
            'background',
            DrawTool.contextMenuChanges.use &&
                DrawTool.contextMenuChanges.props.is_target
                ? DrawTool.highlightGradient
                : 'inherit'
        )
        $('.drawToolContextMenuTargetTypeRow').css(
            'background',
            DrawTool.contextMenuChanges.use &&
                DrawTool.contextMenuChanges.props.target_type
                ? DrawTool.highlightGradient
                : 'inherit'
        )
    },
    ensureTargetTypeOption: function (value) {
        const normalizedValue =
            value != null && String(value).trim() !== ''
                ? String(value).trim()
                : ''
        if (normalizedValue === '') return

        const optionValues = $('#drawToolContextMenuTargetType option')
            .map(function () {
                return $(this).val()
            })
            .get()

        if (!optionValues.includes(normalizedValue)) {
            $('#drawToolContextMenuTargetType').append(
                $('<option></option>')
                    .attr('value', normalizedValue)
                    .text(normalizedValue)
            )
        }
    },
    escapeHtml: function (value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;')
    },
    escapeAttribute: function (value) {
        return ScienceTargets.escapeHtml(value)
    },
}

export default ScienceTargets
