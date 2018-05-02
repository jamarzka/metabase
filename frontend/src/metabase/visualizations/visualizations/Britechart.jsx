/* @flow */

import React, { Component } from "react";
import PropTypes from "prop-types";

import CardRenderer from "../components/CardRenderer.jsx";
import LegendHeader from "../components/LegendHeader.jsx";
import { TitleLegendHeader } from "../components/TitleLegendHeader.jsx";

import "../components/LineAreaBarChart.css";

import { isNumeric, isDate } from "metabase/lib/schema_metadata";
import {
    getChartTypeFromData,
    getFriendlyName
} from "metabase/visualizations/lib/utils";
import { addCSSRule } from "metabase/lib/dom";
import { formatValue } from "metabase/lib/formatting";

import { getSettings } from "metabase/visualizations/lib/settings";

import { MinRowsError, ChartSettingsError } from "metabase/visualizations/lib/errors";

import _ from "underscore";
import cx from "classnames";

const MAX_SERIES = 20;

// import styles from "./Scalar.css";

// import Icon from "metabase/components/Icon.jsx";
// import Tooltip from "metabase/components/Tooltip.jsx";
// import Ellipsified from "metabase/components/Ellipsified.jsx";

// import { formatValue } from "metabase/lib/formatting";
import { TYPE } from "metabase/lib/types";
// import { isNumber } from "metabase/lib/schema_metadata";

// import cx from "classnames";
// import d3 from "d3";

import type { VisualizationProps } from "metabase/meta/types/Visualization";

import LineChart from 'britecharts/dist/umd/line.min';
import { select } from 'd3-selection';


export default class Britechart extends Component {
    props: VisualizationProps;

    static uiName = "Britechart";
    static identifier = "britechart";
    static iconName = "bar";

    static noHeader = true;
    static supportsSeries = true;

    static minSize = { width: 3, height: 3 };

    _scalar: ?HTMLElement;

    static isSensible(cols, rows) {
        return rows.length === 1 && cols.length === 1;
    }

    static checkRenderable([{ data: { cols, rows} }]) {
        // scalar can always be rendered, nothing needed here
    }

    static seriesAreCompatible(initialSeries, newSeries) {
        if (newSeries.data.cols && newSeries.data.cols.length === 1) {
            return true;
        }
        return false;
    }

    static transformSeries(series) {
        if (series.length > 1) {
            return series.map((s, seriesIndex) => ({
                card: {
                    ...s.card,
                    display: "funnel",
                    visualization_settings: {
                        ...s.card.visualization_settings,
                        "graph.x_axis.labels_enabled": false
                    },
                    _seriesIndex: seriesIndex,
                },
                data: {
                    cols: [
                        { base_type: TYPE.Text, display_name: "Name", name: "name" },
                        { ...s.data.cols[0] }],
                    rows: [
                        [s.card.name, s.data.rows[0][0]]
                    ]
                }
            }));
        } else {
            return series;
        }
    }

    static settings = {
        "scalar.locale": {
            title: "Separator style",
            widget: "select",
            props: {
                options: [
                    { name: "100000.00", value: null },
                    { name: "100,000.00", value: "en" },
                    { name: "100 000,00", value: "fr" },
                    { name: "100.000,00", value: "de" }
                ]
            },
            default: "en"
        },
        "scalar.decimals": {
            title: "Number of decimal places",
            widget: "number"
        },
        "scalar.prefix": {
            title: "Add a prefix",
            widget: "input"
        },
        "scalar.suffix": {
            title: "Add a suffix",
            widget: "input"
        },
        "scalar.scale": {
            title: "Multiply by a number",
            widget: "number"
        },
    };

    render() {
        const { series, hovered, showTitle, actionButtons, onChangeCardAndRun, onVisualizationClick, visualizationIsClickable } = this.props;

        const settings = this.getSettings();

        let multiseriesHeaderSeries;
        if (series.length > 1) {
            multiseriesHeaderSeries = series;
        }

        const hasTitle = showTitle && settings["card.title"];

        return (
            <div className={cx("LineAreaBarChart flex flex-column p1", this.getHoverClasses(), this.props.className)}>
                { hasTitle &&
                    <TitleLegendHeader
                        series={series}
                        settings={settings}
                        onChangeCardAndRun={onChangeCardAndRun}
                        actionButtons={actionButtons}
                    />
                }
                { multiseriesHeaderSeries || (!hasTitle && actionButtons) ? // always show action buttons if we have them
                    <LegendHeader
                        className="flex-no-shrink"
                        series={multiseriesHeaderSeries}
                        settings={settings}
                        hovered={hovered}
                        onHoverChange={this.props.onHoverChange}
                        actionButtons={!hasTitle ? actionButtons : null}
                        onChangeCardAndRun={onChangeCardAndRun}
                        onVisualizationClick={onVisualizationClick}
                        visualizationIsClickable={visualizationIsClickable}
                    />
                : null }
                <CardRenderer
                    {...this.props}
                    series={series}
                    settings={settings}
                    className="renderer flex-full"
                    maxSeries={MAX_SERIES}
                    renderer={this.renderer}
                />
            </div>
        );
    }

    renderer(element: Element) {
        // let { series: [{ card, data: { cols, rows }}], className, actionButtons, gridSize, settings, onChangeCardAndRun, visualizationIsClickable, onVisualizationClick } = this.props;
        // let description = settings["card.description"];

        // let isSmall = gridSize && gridSize.width < 4;
        // const column = cols[0];

        console.log('element', element);

        let container = select(element);
        let lineChart = new LineChart();
        let chartMargin = {top:60, bottom: 50, left: 50, right: 30};
        let chartHeight = 320;
        let chartWidth = 320;
        let tooltipShouldShowThreshold = 600;

        let data = {
            topicName: 'San Francisco',
            topic: 123,
            dates: [
                {
                    date: '2017-01-16T16:00:00-08:00',
                    value: 1
                },
                {
                    date: '2017-01-16T17:00:00-08:00',
                    value: 2
                }
            ]
        };

        if (container.node()) {
           lineChart
                .tooltipThreshold(tooltipShouldShowThreshold)
                .margin(chartMargin)
                .height(chartHeight)
                .width(chartWidth);
        }

        // This line gets together container, data and chart
        container.datum(data).call(lineChart);

        /*
        return element;

        let scalarValue = rows[0] && rows[0][0];
        if (scalarValue == null) {
            scalarValue = "";
        }

        let compactScalarValue, fullScalarValue;

        // TODO: some or all of these options should be part of formatValue
        if (typeof scalarValue === "number" && isNumber(column)) {
            let number = scalarValue;

            // scale
            const scale =  parseFloat(settings["scalar.scale"]);
            if (!isNaN(scale)) {
                number *= scale;
            }

            const localeStringOptions = {};

            // decimals
            let decimals = parseFloat(settings["scalar.decimals"]);
            if (!isNaN(decimals)) {
                number = d3.round(number, decimals);
                localeStringOptions.minimumFractionDigits = decimals;
            }

            // currency
            if (settings["scalar.currency"] != null) {
                localeStringOptions.style = "currency";
                localeStringOptions.currency = settings["scalar.currency"];
            }

            try {
                // format with separators and correct number of decimals
                if (settings["scalar.locale"]) {
                    number = number.toLocaleString(settings["scalar.locale"], localeStringOptions);
                } else {
                    // HACK: no locales that don't thousands separators?
                    number = number.toLocaleString("en", localeStringOptions).replace(/,/g, "");
                }
            } catch (e) {
                console.warn("error formatting scalar", e);
            }
            fullScalarValue = formatValue(number, { column: column });
        } else {
            fullScalarValue = formatValue(scalarValue, { column: column });
        }

        compactScalarValue = isSmall ? formatValue(scalarValue, { column: column, compact: true }) : fullScalarValue

        if (settings["scalar.prefix"]) {
            compactScalarValue = settings["scalar.prefix"] + compactScalarValue;
            fullScalarValue = settings["scalar.prefix"] + fullScalarValue;
        }
        if (settings["scalar.suffix"]) {
            compactScalarValue = compactScalarValue + settings["scalar.suffix"];
            fullScalarValue = fullScalarValue + settings["scalar.suffix"];
        }

        const clicked = {
            value: rows[0] && rows[0][0],
            column: cols[0]
        };
        const isClickable = visualizationIsClickable(clicked);

        return (
            <div className={cx(className, styles.Scalar, styles[isSmall ? "small" : "large"])}>
                <div className="Card-title absolute top right p1 px2">{actionButtons}</div>
                <Ellipsified
                    className={cx(styles.Value, 'ScalarValue text-dark fullscreen-normal-text fullscreen-night-text', {
                        "text-brand-hover cursor-pointer": isClickable
                    })}
                    tooltip={fullScalarValue}
                    alwaysShowTooltip={fullScalarValue !== compactScalarValue}
                    style={{maxWidth: '100%'}}
                >
                    <span
                        onClick={isClickable && (() => this._scalar && onVisualizationClick({ ...clicked, element: this._scalar }))}
                        ref={scalar => this._scalar = scalar}
                    >
                        {compactScalarValue}
                    </span>
                </Ellipsified>
                { this.props.isDashboard  && (
                    <div className={styles.Title + " flex align-center relative"}>
                        <Ellipsified tooltip={card.name}>
                            <span
                                onClick={onChangeCardAndRun && (() => onChangeCardAndRun({ nextCard: card }))}
                                className={cx("fullscreen-normal-text fullscreen-night-text", {
                                    "cursor-pointer": !!onChangeCardAndRun
                                })}
                            >
                                <span className="Scalar-title">{settings["card.title"]}</span>
                            </span>

                        </Ellipsified>
                        { description &&
                            <div
                                className="absolute top bottom hover-child flex align-center justify-center"
                                style={{ right: -20, top: 2 }}
                            >
                              <Tooltip tooltip={description} maxWidth={'22em'}>
                                  <Icon name='infooutlined' />
                              </Tooltip>
                          </div>
                        }
                    </div>
                )}
            </div>
        );
        */
    }
}
