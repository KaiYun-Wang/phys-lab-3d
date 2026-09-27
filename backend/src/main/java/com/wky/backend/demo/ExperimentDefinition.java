package com.wky.backend.demo;

import java.util.Map;
import java.util.Set;

/** One experiment adapter for AI demos: capability, sample, validation, ideal readings. */
public interface ExperimentDefinition {

    String route();

    /** Injected into the plan-generation prompt. */
    String capabilityPrompt();

    /** Structural sample plan JSON (not shown in UI). */
    String samplePlanJson();

    /** Validate step params; return error message or null if ok. */
    String validateParams(Map<String, Object> params);

    /** Ideal readings for params (e.g. v2, rho, deltaP). */
    Map<String, Double> idealReadings(Map<String, Object> params);

    Set<String> allowedFocuses();

    default int minSteps() {
        return 3;
    }

    default int maxSteps() {
        return 6;
    }
}
