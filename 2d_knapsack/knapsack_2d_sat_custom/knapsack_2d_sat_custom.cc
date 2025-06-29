// Copyright 2010-2024 Google LLC
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// This file solves a 2D Bin Packing problem as a 2D Knapsack problem.
// It loads the size of the mainrectangle, all available items (rectangles too),
// and tries to fit as many rectangles as possible in the main rectangle.

#include <algorithm>
#include <cstdint>
#include <limits>
#include <string>
#include <vector>
#include <iostream>
#include <fstream>
#include <sstream>


#include "absl/flags/flag.h"
#include "absl/types/span.h"
#include "google/protobuf/text_format.h"
#include "ortools/base/commandlineflags.h"
#include "ortools/base/init_google.h"
#include "ortools/base/logging.h"
#include "ortools/packing/binpacking_2d_parser.h"
#include "ortools/packing/multiple_dimensions_bin_packing.pb.h"
#include "ortools/sat/cp_model.h"
#include "ortools/sat/cp_model_solver.h"

ABSL_FLAG(std::string, input, "", "Input file.");
ABSL_FLAG(int, instance, -1, "Instance number if the file.");
ABSL_FLAG(std::string, params, "", "Sat parameters in text proto format.");

namespace operations_research {
namespace sat {

struct Item {
  std::vector<std::vector<int>> shapes;
  int value;
};
struct Problem {
  std::vector<Item> items;// w h value
  std::vector<int64_t> box;// w h
};
Problem loadFile (const std::string& file_name) {
  std::ifstream infile(file_name.c_str());

  std::string line;
  bool dimensionsRead = false;
  std::vector<int64_t> box = {0,0};
  std::vector<Item> items;
  while (std::getline(infile, line)) {
    std::istringstream iss(line);
    if (!dimensionsRead) {
      int64_t width, height;
      iss >> width >> height;
      box[0] = width;
      box[1] = height;
      dimensionsRead = true;
    } else {
      int w, h, value;
      Item item;
      if (iss >> w >> h >> value) {
        item.shapes.push_back({ w, h });
        item.shapes.push_back({ h, w }); // rotation
        item.value = value;
        items.push_back(item);
      }
    }
  }
  Problem p;
  p.items = items;
  p.box = box;
  return p;
}

// Logs the current cost and fills solution_in_ascii_form with a nice ascii
// drawing of the current solution.
void CheckAndPrint2DSolution(
    const CpSolverResponse& response,
    const Problem& problem,
    absl::Span<const std::vector<IntervalVar>> interval_by_item_dimension,
    std::string* solution_in_ascii_form,
    const std::string& input_file_name
) {
  const int num_items = problem.items.size();

  const int64_t objective = response.objective_value();

  const int size_x = problem.box[0];
  const int size_y = problem.box[1];
  const int64_t box_area = size_x * size_y;
  std::vector<std::vector<int>> values(size_x);
  for (int i = 0; i < size_x; ++i) {
    values[i].resize(size_y, -1);
  }
  int64_t used_area = 0;
  std::ofstream out(input_file_name + ".solution");
  for (int item = 0; item < num_items; ++item) {
    if (!SolutionBooleanValue(
            response, interval_by_item_dimension[item][0].PresenceBoolVar())) {
      continue;
    }
    const int64_t x = SolutionIntegerValue(
        response, interval_by_item_dimension[item][0].StartExpr());
    const int64_t y = SolutionIntegerValue(
        response, interval_by_item_dimension[item][1].StartExpr());
    const int64_t dx = SolutionIntegerValue(
        response, interval_by_item_dimension[item][0].SizeExpr());
    const int64_t dy = SolutionIntegerValue(
        response, interval_by_item_dimension[item][1].SizeExpr());
    used_area += dx * dy;
    if (dx == 0 && dy == 0) {
      continue;
    }
    if (x + dx > size_x || y + dy > size_y) {
      std::cout << "out of shape item?" << item << " " << x << " " << y << " " << dx << " " << dy << std::endl;
      continue;
    }
    out << item << " " << x << " " << y << " " << dx << " " << dy << (item == 0 ? " // item x y dx dy" : "") << std::endl;
    for (int i = x; i < x + dx; ++i) {
      for (int j = y; j < y + dy; ++j) {
        if (i >= size_x || j >= size_y) {
          LOG(WARNING) << "Out of shape box: item = " << item << ", x = " << x
                       << ", y = " << y << ", dx = " << dx << ", dy = " << dy;
        } else {
          if (values[i][j] != -1) {
            LOG(WARNING) << "Item " << item << " overlaps with item "
                         << values[i][j];
          }
          values[i][j] = item;
        }
      }
    }
  }
  if (num_items - objective <= 1) {
    LOG(INFO) << "Cost " << objective << ", " << num_items - objective
              << " item selected, area used: " << used_area << "/" << box_area;
  } else {
    LOG(INFO) << "Cost " << objective << ", " << num_items - objective
              << " items selected, area used: " << used_area << "/" << box_area;
  }
  /*
  solution_in_ascii_form->clear();
  solution_in_ascii_form->append("\n");
  for (int i = 0; i < size_x; ++i) {
    for (int j = 0; j < size_y; ++j) {
      const int v = values[i][j];
      (*solution_in_ascii_form) += v == -1 ? ' ' : 'A' + v;
    }
    solution_in_ascii_form->append("\n");
  }
  */

}

// Load a 2d binpacking problem and solve it as a 2d knapsack problem.
// That is fit the max number of object in one box.
void LoadAndSolve(const std::string& file_name, int instance) {
  const Problem& problem = loadFile(file_name);
  LOG(INFO) << "Instance has " << problem.items.size() << " items";

  //const auto box_dimensions = problem.box_shape().dimensions();
  const std::vector<int64_t> box_dimensions = problem.box;
  const int num_dimensions = box_dimensions.size();
  const int num_items = problem.items.size();

  CpModelBuilder cp_model;

  // Selects the right shape for each item (plus nil shape if not selected).
  // The nil shape is the first choice.
  std::vector<std::vector<BoolVar>> selected(num_items);
  for (int item = 0; item < num_items; ++item) {
    const Item& problemItem = problem.items[item];

    const int num_shapes = problemItem.shapes.size();

    LOG(INFO) << "  - item " << item << " has " << num_shapes << " shapes";
    selected[item].resize(num_shapes + 1);
    for (int shape = 0; shape <= num_shapes; ++shape) {
      selected[item][shape] = cp_model.NewBoolVar();
    }
  }

  // Exactly one shape is selected for each item.
  for (int item = 0; item < num_items; ++item) {
    cp_model.AddEquality(LinearExpr::Sum(selected[item]), 1);
  }

  // Manages positions and sizes for each item.
  std::vector<std::vector<IntervalVar>> interval_by_item_dimension(num_items);
  for (int item = 0; item < num_items; ++item) {
    interval_by_item_dimension[item].resize(num_dimensions);
    const Item& problemItem = problem.items[item];
    const int num_shapes = problemItem.shapes.size();
    for (int dim = 0; dim < num_dimensions; ++dim) {
      if (num_shapes == 1) {
        const int64_t dimension = box_dimensions[dim];
        const Item& problemItem = problem.items[item];
        const int64_t size = problemItem.shapes[0][dim];
        IntVar start = cp_model.NewIntVar({0, dimension - size});
        interval_by_item_dimension[item][dim] =
            cp_model.NewOptionalFixedSizeIntervalVar(start, size,
                                                     selected[item][1]);
      } else {
        const Domain dimension(0, box_dimensions[dim]);
        const IntVar start = cp_model.NewIntVar(dimension);
        const IntVar size = cp_model.NewIntVar(dimension);
        const IntVar end = cp_model.NewIntVar(dimension);
        interval_by_item_dimension[item][dim] =
            cp_model.NewIntervalVar(start, size, end);

        for (int shape = 0; shape <= num_shapes; ++shape) {
          const Item& problemItem = problem.items[item];
          const int64_t item_size_in_dim =
              shape == 0
                  ? 0
                  : problemItem.shapes[shape - 1][dim];
          cp_model.AddEquality(size, item_size_in_dim)
              .OnlyEnforceIf(selected[item][shape]);
        }
      }
    }
  }

  // Non overlapping.
  if (num_dimensions == 1) {
    LOG(FATAL) << "One dimension is not supported.";
  } else if (num_dimensions == 2) {
    LOG(INFO) << "Box size: " << box_dimensions[0] << "*" << box_dimensions[1];
    NoOverlap2DConstraint no_overlap_2d = cp_model.AddNoOverlap2D();
    for (int item = 0; item < num_items; ++item) {
      
      no_overlap_2d.AddRectangle(interval_by_item_dimension[item][0],
                                 interval_by_item_dimension[item][1]);
    }
  } else {
    LOG(FATAL) << num_dimensions << " dimensions not supported.";
  }

  // Objective.
  LinearExpr objective;
  for (int item_id = 0; item_id < num_items; ++item_id) {
    const Item& problemItem = problem.items[item_id];
    objective += selected[item_id][0] * problemItem.value;
  }
  cp_model.Minimize(objective);

  Model model;
  // Setup parameters.
  SatParameters parameters;
  parameters.set_log_search_progress(true);
  // Parse the --params flag.
  if (!absl::GetFlag(FLAGS_params).empty()) {
    CHECK(google::protobuf::TextFormat::MergeFromString(
        absl::GetFlag(FLAGS_params), &parameters))
        << absl::GetFlag(FLAGS_params);
  }
  model.Add(NewSatParameters(parameters));
  std::string solution_in_ascii_form;
  model.Add(NewFeasibleSolutionObserver([&](const CpSolverResponse& r) {
    if (num_dimensions == 2) {
      CheckAndPrint2DSolution(r, problem, interval_by_item_dimension,
                              &solution_in_ascii_form, file_name);
    }
  }));

  const CpSolverResponse response = SolveCpModel(cp_model.Build(), &model);

  if (!solution_in_ascii_form.empty()) {
    LOG(INFO) << solution_in_ascii_form;
  }
}

}  // namespace sat
}  // namespace operations_research

int main(int argc, char** argv) {
  absl::SetFlag(&FLAGS_stderrthreshold, 0);
  InitGoogle(argv[0], &argc, &argv, true);
  if (absl::GetFlag(FLAGS_input).empty()) {
    std::cout << "Please supply a data file with --input=" << std::endl;
    return EXIT_SUCCESS;
  }
  if (absl::GetFlag(FLAGS_input).empty()) {
    std::cout << "Please supply a data file with --input=" << std::endl;
    return EXIT_SUCCESS;
  }

  operations_research::sat::LoadAndSolve(absl::GetFlag(FLAGS_input),
                                         absl::GetFlag(FLAGS_instance));
  return EXIT_SUCCESS;
}
