package com.wky.backend.demo;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class ExperimentDefinitionRegistry {

    private final Map<String, ExperimentDefinition> byRoute;

    public ExperimentDefinitionRegistry(List<ExperimentDefinition> definitions) {
        this.byRoute = definitions.stream()
                .collect(Collectors.toMap(ExperimentDefinition::route, Function.identity()));
    }

    public ExperimentDefinition find(String route) {
        if (!StringUtils.hasText(route)) {
            return null;
        }
        return byRoute.get(route.trim());
    }

    public boolean supports(String route) {
        return find(route) != null;
    }
}
