"""
Tests for .github/workflows/codeql.yml

Validates the structure, configuration, and correctness of the CodeQL
Advanced workflow used for security scanning of the repository.
"""

import os
import unittest
import yaml


WORKFLOW_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", ".github", "workflows", "codeql.yml"
)


def load_workflow():
    with open(WORKFLOW_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def get_triggers(workflow):
    """PyYAML parses the bare YAML keyword 'on' as Python boolean True."""
    return workflow.get(True) or workflow.get("on")


class TestCodeQLWorkflowFileValidity(unittest.TestCase):
    """Tests that the workflow file is valid and parseable."""

    def test_file_exists(self):
        self.assertTrue(
            os.path.isfile(WORKFLOW_PATH),
            f"Workflow file not found at {WORKFLOW_PATH}",
        )

    def test_file_is_valid_yaml(self):
        """The file must be parseable as valid YAML without errors."""
        try:
            workflow = load_workflow()
        except yaml.YAMLError as e:
            self.fail(f"codeql.yml is not valid YAML: {e}")
        self.assertIsNotNone(workflow)

    def test_file_parses_to_dict(self):
        workflow = load_workflow()
        self.assertIsInstance(workflow, dict)

    def test_required_top_level_keys_present(self):
        """'on' is parsed as True by PyYAML (bare YAML boolean synonym)."""
        workflow = load_workflow()
        self.assertIn("name", workflow)
        self.assertIn("jobs", workflow)
        # PyYAML parses bare 'on' as Python True
        self.assertIsNotNone(
            get_triggers(workflow), "Missing required top-level key: 'on'"
        )


class TestCodeQLWorkflowName(unittest.TestCase):
    """Tests the workflow name field."""

    def test_workflow_name(self):
        workflow = load_workflow()
        self.assertEqual(workflow["name"], "CodeQL Advanced")

    def test_workflow_name_is_string(self):
        workflow = load_workflow()
        self.assertIsInstance(workflow["name"], str)


class TestCodeQLWorkflowTriggers(unittest.TestCase):
    """Tests the 'on' triggers section."""

    def setUp(self):
        self.workflow = load_workflow()
        self.triggers = get_triggers(self.workflow)

    def test_on_section_is_dict(self):
        self.assertIsInstance(self.triggers, dict)

    def test_push_trigger_present(self):
        self.assertIn("push", self.triggers)

    def test_push_triggers_on_main_branch(self):
        branches = self.triggers["push"]["branches"]
        self.assertIn("main", branches)

    def test_push_triggers_only_on_main(self):
        branches = self.triggers["push"]["branches"]
        self.assertEqual(len(branches), 1)
        self.assertEqual(branches[0], "main")

    def test_pull_request_trigger_present(self):
        self.assertIn("pull_request", self.triggers)

    def test_pull_request_triggers_on_main_branch(self):
        branches = self.triggers["pull_request"]["branches"]
        self.assertIn("main", branches)

    def test_pull_request_triggers_only_on_main(self):
        branches = self.triggers["pull_request"]["branches"]
        self.assertEqual(len(branches), 1)
        self.assertEqual(branches[0], "main")

    def test_schedule_trigger_present(self):
        self.assertIn("schedule", self.triggers)

    def test_schedule_has_cron_entry(self):
        schedule = self.triggers["schedule"]
        self.assertIsInstance(schedule, list)
        self.assertGreater(len(schedule), 0)
        self.assertIn("cron", schedule[0])

    def test_schedule_cron_value(self):
        """Cron is set to run weekly on Wednesdays at 14:45 UTC."""
        cron = self.triggers["schedule"][0]["cron"]
        self.assertEqual(cron, "45 14 * * 3")

    def test_schedule_cron_day_is_wednesday(self):
        """Day-of-week field (5th) should be 3 = Wednesday."""
        cron = self.triggers["schedule"][0]["cron"]
        parts = cron.split()
        self.assertEqual(len(parts), 5, "Cron expression must have 5 fields")
        self.assertEqual(parts[4], "3", "Day-of-week should be 3 (Wednesday)")

    def test_no_unexpected_triggers(self):
        """Workflow should only trigger on push, pull_request, and schedule."""
        expected = {"push", "pull_request", "schedule"}
        actual = set(self.triggers.keys())
        self.assertEqual(actual, expected)


class TestCodeQLWorkflowJobs(unittest.TestCase):
    """Tests the jobs section."""

    def setUp(self):
        self.workflow = load_workflow()
        self.jobs = self.workflow["jobs"]

    def test_jobs_section_is_dict(self):
        self.assertIsInstance(self.jobs, dict)

    def test_analyze_job_exists(self):
        self.assertIn("analyze", self.jobs)

    def test_only_one_job_defined(self):
        self.assertEqual(len(self.jobs), 1)


class TestCodeQLAnalyzeJob(unittest.TestCase):
    """Tests the 'analyze' job configuration."""

    def setUp(self):
        self.workflow = load_workflow()
        self.job = self.workflow["jobs"]["analyze"]

    def test_job_name_contains_language_expression(self):
        name = self.job["name"]
        self.assertIn("matrix.language", name)

    def test_runs_on_ubuntu_latest_default(self):
        runs_on = self.job["runs-on"]
        self.assertIn("ubuntu-latest", str(runs_on))

    def test_runs_on_macos_latest_for_swift(self):
        """Runner expression should route swift to macos-latest."""
        runs_on = self.job["runs-on"]
        self.assertIn("macos-latest", str(runs_on))

    def test_runs_on_conditional_expression(self):
        runs_on = self.job["runs-on"]
        self.assertIn("swift", str(runs_on))


class TestCodeQLJobPermissions(unittest.TestCase):
    """Tests the permissions block of the analyze job."""

    def setUp(self):
        self.workflow = load_workflow()
        self.permissions = self.workflow["jobs"]["analyze"]["permissions"]

    def test_permissions_section_present(self):
        self.assertIsNotNone(self.permissions)

    def test_security_events_write(self):
        self.assertIn("security-events", self.permissions)
        self.assertEqual(self.permissions["security-events"], "write")

    def test_packages_read(self):
        self.assertIn("packages", self.permissions)
        self.assertEqual(self.permissions["packages"], "read")

    def test_actions_read(self):
        self.assertIn("actions", self.permissions)
        self.assertEqual(self.permissions["actions"], "read")

    def test_contents_read(self):
        self.assertIn("contents", self.permissions)
        self.assertEqual(self.permissions["contents"], "read")

    def test_no_write_permissions_except_security_events(self):
        """Only security-events should have write; others must be read."""
        for key, value in self.permissions.items():
            if key != "security-events":
                self.assertEqual(
                    value,
                    "read",
                    f"Permission '{key}' should be 'read', got '{value}'",
                )

    def test_no_overly_broad_permissions(self):
        """No permission should be 'admin' or 'write' except security-events."""
        overly_broad = {"admin", "write"}
        for key, value in self.permissions.items():
            if key == "security-events":
                continue
            self.assertNotIn(
                value,
                overly_broad,
                f"Permission '{key}' has overly broad value '{value}'",
            )


class TestCodeQLJobStrategy(unittest.TestCase):
    """Tests the strategy/matrix configuration."""

    def setUp(self):
        self.workflow = load_workflow()
        self.strategy = self.workflow["jobs"]["analyze"]["strategy"]

    def test_strategy_section_present(self):
        self.assertIsNotNone(self.strategy)

    def test_fail_fast_is_false(self):
        self.assertIn("fail-fast", self.strategy)
        self.assertFalse(self.strategy["fail-fast"])

    def test_matrix_present(self):
        self.assertIn("matrix", self.strategy)

    def test_matrix_has_include(self):
        matrix = self.strategy["matrix"]
        self.assertIn("include", matrix)

    def test_matrix_include_is_list(self):
        include = self.strategy["matrix"]["include"]
        self.assertIsInstance(include, list)

    def test_matrix_has_at_least_one_entry(self):
        include = self.strategy["matrix"]["include"]
        self.assertGreater(len(include), 0)

    def test_javascript_typescript_entry_exists(self):
        include = self.strategy["matrix"]["include"]
        languages = [entry["language"] for entry in include]
        self.assertIn("javascript-typescript", languages)

    def test_javascript_typescript_build_mode_is_none(self):
        include = self.strategy["matrix"]["include"]
        js_entry = next(
            (e for e in include if e["language"] == "javascript-typescript"), None
        )
        self.assertIsNotNone(js_entry, "javascript-typescript entry not found")
        self.assertEqual(js_entry["build-mode"], "none")

    def test_each_matrix_entry_has_language_key(self):
        include = self.strategy["matrix"]["include"]
        for i, entry in enumerate(include):
            self.assertIn("language", entry, f"Matrix entry {i} is missing 'language'")

    def test_each_matrix_entry_has_build_mode_key(self):
        include = self.strategy["matrix"]["include"]
        for i, entry in enumerate(include):
            self.assertIn(
                "build-mode", entry, f"Matrix entry {i} is missing 'build-mode'"
            )


class TestCodeQLJobSteps(unittest.TestCase):
    """Tests the steps defined in the analyze job."""

    def setUp(self):
        self.workflow = load_workflow()
        self.steps = self.workflow["jobs"]["analyze"]["steps"]

    def test_steps_present(self):
        self.assertIsNotNone(self.steps)

    def test_steps_is_list(self):
        self.assertIsInstance(self.steps, list)

    def test_at_least_three_steps(self):
        """Minimum: checkout, init, analyze (manual build is conditional)."""
        self.assertGreaterEqual(len(self.steps), 3)

    def _get_step_by_name(self, name):
        return next((s for s in self.steps if s.get("name") == name), None)

    def _get_step_by_uses_prefix(self, prefix):
        return next(
            (s for s in self.steps if str(s.get("uses", "")).startswith(prefix)), None
        )


class TestCodeQLCheckoutStep(unittest.TestCase):
    """Tests the repository checkout step."""

    def setUp(self):
        self.workflow = load_workflow()
        self.steps = self.workflow["jobs"]["analyze"]["steps"]
        self.step = next(
            (s for s in self.steps if s.get("name") == "Checkout repository"), None
        )

    def test_checkout_step_exists(self):
        self.assertIsNotNone(self.step, "'Checkout repository' step not found")

    def test_checkout_step_is_first(self):
        self.assertEqual(self.steps[0].get("name"), "Checkout repository")

    def test_checkout_uses_actions_checkout(self):
        self.assertIn("actions/checkout", self.step["uses"])

    def test_checkout_uses_v4(self):
        self.assertTrue(
            self.step["uses"].endswith("@v4"),
            f"Expected actions/checkout@v4, got {self.step['uses']}",
        )

    def test_checkout_step_has_no_with(self):
        """Default checkout requires no extra configuration."""
        self.assertNotIn("with", self.step)


class TestCodeQLInitStep(unittest.TestCase):
    """Tests the Initialize CodeQL step."""

    def setUp(self):
        self.workflow = load_workflow()
        self.steps = self.workflow["jobs"]["analyze"]["steps"]
        self.step = next(
            (s for s in self.steps if s.get("name") == "Initialize CodeQL"), None
        )

    def test_init_step_exists(self):
        self.assertIsNotNone(self.step, "'Initialize CodeQL' step not found")

    def test_init_uses_codeql_init_action(self):
        self.assertIn("github/codeql-action/init", self.step["uses"])

    def test_init_uses_v4(self):
        self.assertTrue(
            self.step["uses"].endswith("@v4"),
            f"Expected github/codeql-action/init@v4, got {self.step['uses']}",
        )

    def test_init_has_with_block(self):
        self.assertIn("with", self.step)

    def test_init_with_languages_uses_matrix_expression(self):
        languages_val = self.step["with"]["languages"]
        self.assertIn("matrix.language", str(languages_val))

    def test_init_with_build_mode_uses_matrix_expression(self):
        build_mode_val = self.step["with"]["build-mode"]
        self.assertIn("matrix.build-mode", str(build_mode_val))


class TestCodeQLManualBuildStep(unittest.TestCase):
    """Tests the conditional manual build step."""

    def setUp(self):
        self.workflow = load_workflow()
        self.steps = self.workflow["jobs"]["analyze"]["steps"]
        self.step = next(
            (s for s in self.steps if s.get("name") == "Run manual build steps"), None
        )

    def test_manual_build_step_exists(self):
        self.assertIsNotNone(self.step, "'Run manual build steps' step not found")

    def test_manual_build_step_has_condition(self):
        self.assertIn("if", self.step)

    def test_manual_build_condition_checks_manual_mode(self):
        condition = self.step["if"]
        self.assertIn("manual", str(condition))
        self.assertIn("build-mode", str(condition))

    def test_manual_build_uses_bash_shell(self):
        self.assertEqual(self.step.get("shell"), "bash")

    def test_manual_build_has_run_block(self):
        self.assertIn("run", self.step)

    def test_manual_build_run_is_string(self):
        self.assertIsInstance(self.step["run"], str)

    def test_manual_build_run_exits_with_error(self):
        """Placeholder build must fail so users know to replace it."""
        self.assertIn("exit 1", self.step["run"])

    def test_manual_build_step_is_not_uses_action(self):
        """This step runs a shell command, not a reusable action."""
        self.assertNotIn("uses", self.step)


class TestCodeQLAnalyzeStep(unittest.TestCase):
    """Tests the Perform CodeQL Analysis step."""

    def setUp(self):
        self.workflow = load_workflow()
        self.steps = self.workflow["jobs"]["analyze"]["steps"]
        self.step = next(
            (s for s in self.steps if s.get("name") == "Perform CodeQL Analysis"), None
        )

    def test_analyze_step_exists(self):
        self.assertIsNotNone(self.step, "'Perform CodeQL Analysis' step not found")

    def test_analyze_step_is_last(self):
        self.assertEqual(self.steps[-1].get("name"), "Perform CodeQL Analysis")

    def test_analyze_uses_codeql_analyze_action(self):
        self.assertIn("github/codeql-action/analyze", self.step["uses"])

    def test_analyze_uses_v4(self):
        self.assertTrue(
            self.step["uses"].endswith("@v4"),
            f"Expected github/codeql-action/analyze@v4, got {self.step['uses']}",
        )

    def test_analyze_has_with_block(self):
        self.assertIn("with", self.step)

    def test_analyze_category_uses_language_expression(self):
        category = str(self.step["with"]["category"])
        self.assertIn("matrix.language", category)

    def test_analyze_category_format_includes_language_prefix(self):
        """Category must follow the '/language:<value>' format."""
        category = str(self.step["with"]["category"])
        self.assertIn("/language:", category)

    def test_analyze_step_has_no_condition(self):
        """Analysis step should always run (no 'if' condition)."""
        self.assertNotIn("if", self.step)


class TestCodeQLActionVersionConsistency(unittest.TestCase):
    """Tests that CodeQL action versions are consistent across steps."""

    def setUp(self):
        self.workflow = load_workflow()
        self.steps = self.workflow["jobs"]["analyze"]["steps"]

    def _extract_version(self, uses_str):
        if "@" in uses_str:
            return uses_str.split("@")[-1]
        return None

    def test_codeql_init_and_analyze_use_same_version(self):
        init_step = next(
            (s for s in self.steps if "codeql-action/init" in str(s.get("uses", ""))),
            None,
        )
        analyze_step = next(
            (
                s
                for s in self.steps
                if "codeql-action/analyze" in str(s.get("uses", ""))
            ),
            None,
        )
        self.assertIsNotNone(init_step)
        self.assertIsNotNone(analyze_step)

        init_version = self._extract_version(init_step["uses"])
        analyze_version = self._extract_version(analyze_step["uses"])
        self.assertEqual(
            init_version,
            analyze_version,
            f"CodeQL init version ({init_version}) differs from analyze version ({analyze_version})",
        )

    def test_all_codeql_actions_use_v4(self):
        codeql_steps = [
            s
            for s in self.steps
            if "codeql-action" in str(s.get("uses", ""))
        ]
        for step in codeql_steps:
            version = self._extract_version(step["uses"])
            self.assertEqual(
                version,
                "v4",
                f"Step '{step.get('name')}' uses codeql-action version '{version}', expected 'v4'",
            )


class TestCodeQLWorkflowStepOrder(unittest.TestCase):
    """Tests that workflow steps appear in the correct logical order."""

    def setUp(self):
        self.workflow = load_workflow()
        self.steps = self.workflow["jobs"]["analyze"]["steps"]
        self.step_names = [s.get("name", "") for s in self.steps]

    def test_checkout_before_init(self):
        checkout_idx = next(
            (i for i, n in enumerate(self.step_names) if "Checkout" in n), -1
        )
        init_idx = next(
            (i for i, n in enumerate(self.step_names) if "Initialize CodeQL" in n), -1
        )
        self.assertGreater(init_idx, checkout_idx)

    def test_init_before_analyze(self):
        init_idx = next(
            (i for i, n in enumerate(self.step_names) if "Initialize CodeQL" in n), -1
        )
        analyze_idx = next(
            (i for i, n in enumerate(self.step_names) if "Perform CodeQL Analysis" in n),
            -1,
        )
        self.assertGreater(analyze_idx, init_idx)

    def test_manual_build_between_init_and_analyze(self):
        init_idx = next(
            (i for i, n in enumerate(self.step_names) if "Initialize CodeQL" in n), -1
        )
        manual_idx = next(
            (i for i, n in enumerate(self.step_names) if "Run manual build steps" in n),
            -1,
        )
        analyze_idx = next(
            (i for i, n in enumerate(self.step_names) if "Perform CodeQL Analysis" in n),
            -1,
        )
        self.assertGreater(manual_idx, init_idx)
        self.assertGreater(analyze_idx, manual_idx)


class TestCodeQLWorkflowBoundaryAndRegression(unittest.TestCase):
    """Regression and boundary tests for edge cases."""

    def setUp(self):
        self.workflow = load_workflow()

    def test_workflow_file_is_not_empty(self):
        with open(WORKFLOW_PATH, "r", encoding="utf-8") as f:
            content = f.read().strip()
        self.assertGreater(len(content), 0)

    def test_workflow_has_no_null_top_level_values(self):
        for key, value in self.workflow.items():
            self.assertIsNotNone(value, f"Top-level key '{key}' has null value")

    def test_matrix_language_value_is_valid_codeql_language(self):
        """Confirm language is from the set CodeQL supports."""
        valid_languages = {
            "actions",
            "c-cpp",
            "csharp",
            "go",
            "java-kotlin",
            "javascript-typescript",
            "python",
            "ruby",
            "rust",
            "swift",
        }
        include = self.workflow["jobs"]["analyze"]["strategy"]["matrix"]["include"]
        for entry in include:
            self.assertIn(
                entry["language"],
                valid_languages,
                f"Language '{entry['language']}' is not a supported CodeQL language",
            )

    def test_matrix_build_mode_value_is_valid(self):
        """build-mode must be one of: none, autobuild, manual."""
        valid_modes = {"none", "autobuild", "manual"}
        include = self.workflow["jobs"]["analyze"]["strategy"]["matrix"]["include"]
        for entry in include:
            self.assertIn(
                entry["build-mode"],
                valid_modes,
                f"build-mode '{entry['build-mode']}' is not a valid CodeQL build mode",
            )

    def test_no_plaintext_secrets_in_workflow(self):
        """Workflow must not contain any hardcoded secret-like values."""
        with open(WORKFLOW_PATH, "r", encoding="utf-8") as f:
            content = f.read()
        import re
        # Check for patterns that look like hardcoded tokens or passwords
        suspicious_patterns = [
            r'(?i)(password|passwd|secret|api_key|token)\s*[:=]\s*["\']?[A-Za-z0-9+/]{16,}',
        ]
        for pattern in suspicious_patterns:
            matches = re.findall(pattern, content)
            self.assertEqual(
                len(matches),
                0,
                f"Potential hardcoded secret found matching pattern: {pattern}",
            )

    def test_cron_schedule_is_not_too_frequent(self):
        """Cron should not run more frequently than daily to avoid overuse."""
        cron = get_triggers(self.workflow)["schedule"][0]["cron"]
        parts = cron.split()
        # A cron with '*' in both minute and hour fields would run every minute
        # At minimum, the hour field should not be '*' for a security scan
        hour_field = parts[1]
        self.assertNotEqual(
            hour_field,
            "*",
            "Schedule cron hour field should not be '*' (would run every hour)",
        )

    def test_permissions_block_is_least_privilege(self):
        """security-events is the only write permission; all others are read."""
        permissions = self.workflow["jobs"]["analyze"]["permissions"]
        write_permissions = [k for k, v in permissions.items() if v == "write"]
        self.assertEqual(
            write_permissions,
            ["security-events"],
            f"Expected only 'security-events' to have write, got: {write_permissions}",
        )

    def test_all_uses_references_are_pinned_to_version(self):
        """Every 'uses' action reference must include a version tag."""
        steps = self.workflow["jobs"]["analyze"]["steps"]
        for step in steps:
            if "uses" in step:
                uses = step["uses"]
                self.assertIn(
                    "@",
                    uses,
                    f"Action '{uses}' is not pinned to a version (missing '@')",
                )