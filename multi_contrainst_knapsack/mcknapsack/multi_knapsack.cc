// https://developers.google.com/optimization/pack/knapsack
#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <iterator>
#include <numeric>
#include <sstream>
#include <vector>
#include <fstream>

#include "ortools/algorithms/knapsack_solver.h"
#include <iostream>
int main(int argc, char** argv) {
  std::ifstream iss("mcknapsack/build/input.txt");
  size_t valuesSize, weightsSize, weightsRowSize, capacitiesSize;
  iss >> valuesSize;
  iss >> weightsSize;
  iss >> weightsRowSize;
  iss >> capacitiesSize;

  // Instantiate the solver.
  operations_research::KnapsackSolver solver(
      operations_research::KnapsackSolver::KNAPSACK_MULTIDIMENSION_CBC_MIP_SOLVER,
      "KnapsackExample");

  std::vector<int64_t> values(valuesSize);
  size_t value;
  for (size_t i = 0; i < valuesSize; ++i) {
    iss >> value;
    values[i] = value;
  }

  std::vector<std::vector<int64_t>> weights(weightsSize);
  for (size_t i = 0; i < weightsSize; ++i) {
    for (size_t j = 0; j < weightsRowSize; ++j) {
      iss >> value;
      std::cout<<"pushing "<<value<<std::endl;
      weights[i].push_back(value);
    }
  }

  std::vector<int64_t> capacities(capacitiesSize);
  for (size_t i = 0; i < capacitiesSize; ++i) {
    iss >> value;
    capacities[i] = value;
  }

  solver.Init(values, weights, capacities);
  int64_t computed_value = solver.Solve();

  std::ofstream oss("mcknapsack/build/output.txt");
  for (std::size_t i = 0; i < values.size(); ++i) {
    if (solver.BestSolutionContains(i)) {
      oss << 1;
    } else {
      oss << 0;
    }
    oss << " ";
  }
  return EXIT_SUCCESS;
}